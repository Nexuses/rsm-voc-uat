import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import {
  canTransition,
  closeBlockedReason,
  type CaseSeverity,
  type CaseStatus,
} from "@/lib/cases/state";
import { db } from "@/lib/db";
import { emitEventSafely } from "@/lib/events/emit";

// Placeholder targets until RSM confirms its recovery SLA; editable in SlaPolicy.
const DEFAULT_SLA_POLICIES: Array<{
  key: string;
  name: string;
  severity: CaseSeverity;
  firstResponseHours: number;
  resolutionHours: number;
}> = [
  {
    key: "default-high",
    name: "High severity (default)",
    severity: "high",
    firstResponseHours: 24,
    resolutionHours: 120,
  },
  {
    key: "default-medium",
    name: "Medium severity (default)",
    severity: "medium",
    firstResponseHours: 48,
    resolutionHours: 240,
  },
];

export function needsAttentionDedupeKey(responseId: string) {
  return `response:${responseId}:needs-attention`;
}

export async function ensureDefaultSlaPolicies() {
  for (const policy of DEFAULT_SLA_POLICIES) {
    await db.slaPolicy.upsert({
      where: { key: policy.key },
      create: { id: randomUUID(), ...policy },
      update: {},
    });
  }
}

async function slaPolicyFor(severity: CaseSeverity) {
  await ensureDefaultSlaPolicies();
  return db.slaPolicy.findFirst({
    where: { severity, active: true },
    orderBy: { createdAt: "asc" },
  });
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export async function createNeedsAttentionCase(input: {
  responseId: string;
  automationExecutionId: string;
  metrics: string[];
  severity: CaseSeverity;
  correlationId?: string | null;
  now?: Date;
}) {
  const dedupeKey = needsAttentionDedupeKey(input.responseId);
  const existing = await db.case.findUnique({ where: { dedupeKey } });
  if (existing) return { created: false as const, case: existing };

  const now = input.now ?? new Date();
  const policy = await slaPolicyFor(input.severity);
  const slaDueAt = policy ? addHours(now, policy.resolutionHours) : null;
  const firstResponseDueAt = policy
    ? addHours(now, policy.firstResponseHours)
    : null;

  try {
    const created = await db.$transaction(async (tx) => {
      const record = await tx.case.create({
        data: {
          id: randomUUID(),
          dedupeKey,
          title: `Low ${input.metrics.join(", ")} score follow-up`,
          severity: input.severity,
          source: "automation",
          responseId: input.responseId,
          slaPolicyId: policy?.id ?? null,
          slaDueAt,
          triggerMetrics: input.metrics as Prisma.InputJsonValue,
          automationExecutionId: input.automationExecutionId,
          correlationId: input.correlationId ?? null,
        },
      });
      await tx.caseActivity.create({
        data: {
          id: randomUUID(),
          caseId: record.id,
          type: "created",
          actorType: "system",
          toStatus: "new",
          metadata: { metrics: input.metrics },
        },
      });
      await tx.task.create({
        data: {
          id: randomUUID(),
          caseId: record.id,
          title: "Contact the client about their feedback",
          dueAt: firstResponseDueAt,
        },
      });
      return record;
    });

    await writeAuditLog({
      actorType: "system",
      action: "case.created",
      resourceType: "Case",
      resourceId: created.id,
      after: { status: created.status, severity: created.severity },
      metadata: { responseId: input.responseId, metrics: input.metrics },
      source: "worker",
      correlationId: input.correlationId ?? undefined,
    });
    await emitEventSafely({
      type: "CASE_CREATED",
      idempotencyKey: `case:${created.id}:created`,
      aggregateId: created.id,
      payload: {
        caseId: created.id,
        responseId: input.responseId,
        severity: created.severity,
      },
      correlationId: input.correlationId ?? undefined,
    });
    return { created: true as const, case: created };
  } catch (error) {
    // Lost a race with a concurrent retry: the unique dedupeKey already holds.
    const raced = await db.case.findUnique({ where: { dedupeKey } });
    if (raced) return { created: false as const, case: raced };
    throw error;
  }
}

export class CaseTransitionError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export async function transitionCase(input: {
  caseId: string;
  toStatus: CaseStatus;
  actorUserId: string;
  note?: string;
}) {
  const current = await db.case.findUnique({ where: { id: input.caseId } });
  if (!current) throw new CaseTransitionError("Case not found", 404);
  if (!canTransition(current.status, input.toStatus)) {
    throw new CaseTransitionError(
      `Cannot move a ${current.status} case to ${input.toStatus}`,
      409
    );
  }
  const blocked = closeBlockedReason({
    from: current.status,
    to: input.toStatus,
    requiresClientConfirmation: current.requiresClientConfirmation,
    clientConfirmedAt: current.clientConfirmedAt,
  });
  if (blocked) throw new CaseTransitionError(blocked, 409);

  const now = new Date();
  const updated = await db.$transaction(async (tx) => {
    const record = await tx.case.update({
      where: { id: current.id },
      data: {
        status: input.toStatus,
        firstRespondedAt:
          current.firstRespondedAt ??
          (input.toStatus === "in_progress" ? now : undefined),
        resolvedAt:
          input.toStatus === "resolved"
            ? now
            : input.toStatus === "reopened"
              ? null
              : undefined,
        closedAt:
          input.toStatus === "closed"
            ? now
            : input.toStatus === "reopened"
              ? null
              : undefined,
      },
    });
    await tx.caseActivity.create({
      data: {
        id: randomUUID(),
        caseId: current.id,
        type: "status_changed",
        actorType: "user",
        actorUserId: input.actorUserId,
        fromStatus: current.status,
        toStatus: input.toStatus,
        message: input.note?.slice(0, 2000) || null,
      },
    });
    return record;
  });

  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "case.status_changed",
    resourceType: "Case",
    resourceId: current.id,
    before: { status: current.status },
    after: { status: updated.status },
    source: "api",
    correlationId: current.correlationId ?? undefined,
  });
  if (input.toStatus === "resolved") {
    await emitEventSafely({
      type: "CASE_RESOLVED",
      idempotencyKey: `case:${current.id}:resolved:${now.getTime()}`,
      aggregateId: current.id,
      payload: { caseId: current.id },
      correlationId: current.correlationId ?? undefined,
    });
  }
  return updated;
}

export async function setClientConfirmationRequired(input: {
  caseId: string;
  required: boolean;
  actorUserId: string;
}) {
  const current = await db.case.findUnique({ where: { id: input.caseId } });
  if (!current) throw new CaseTransitionError("Case not found", 404);
  if (current.requiresClientConfirmation === input.required) return current;
  const updated = await db.$transaction(async (tx) => {
    const record = await tx.case.update({
      where: { id: current.id },
      data: { requiresClientConfirmation: input.required },
    });
    await tx.caseActivity.create({
      data: {
        id: randomUUID(),
        caseId: current.id,
        type: input.required ? "confirmation_required" : "confirmation_not_required",
        actorType: "user",
        actorUserId: input.actorUserId,
      },
    });
    return record;
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "case.status_changed",
    resourceType: "Case",
    resourceId: current.id,
    before: { requiresClientConfirmation: current.requiresClientConfirmation },
    after: { requiresClientConfirmation: input.required },
    source: "api",
    correlationId: current.correlationId ?? undefined,
  });
  return updated;
}

/**
 * Records what the client said about the fix. A "not confirmed" answer on a
 * resolved case reopens it.
 */
export async function recordClientConfirmation(input: {
  caseId: string;
  confirmed: boolean;
  note?: string;
  actorUserId: string;
}) {
  const current = await db.case.findUnique({ where: { id: input.caseId } });
  if (!current) throw new CaseTransitionError("Case not found", 404);
  if (!["resolved", "awaiting_client"].includes(current.status)) {
    throw new CaseTransitionError(
      "Client confirmation can be recorded on resolved or awaiting-client cases only",
      409
    );
  }

  const now = new Date();
  const reopen = !input.confirmed && current.status === "resolved";
  const note = input.note?.slice(0, 2000) || null;
  const updated = await db.$transaction(async (tx) => {
    const record = await tx.case.update({
      where: { id: current.id },
      data: input.confirmed
        ? { clientConfirmedAt: now, clientConfirmedBy: input.actorUserId, clientConfirmationNote: note }
        : {
            clientConfirmedAt: null,
            clientConfirmedBy: null,
            clientConfirmationNote: note,
            ...(reopen ? { status: "reopened", resolvedAt: null } : {}),
          },
    });
    await tx.caseActivity.create({
      data: {
        id: randomUUID(),
        caseId: current.id,
        type: input.confirmed ? "client_confirmed" : "client_not_confirmed",
        actorType: "user",
        actorUserId: input.actorUserId,
        fromStatus: reopen ? current.status : null,
        toStatus: reopen ? "reopened" : null,
        message: note,
      },
    });
    return record;
  });

  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "case.client_confirmed",
    resourceType: "Case",
    resourceId: current.id,
    before: { status: current.status, clientConfirmedAt: current.clientConfirmedAt?.toISOString() ?? null },
    after: { status: updated.status, confirmed: input.confirmed },
    source: "api",
    correlationId: current.correlationId ?? undefined,
  });
  await emitEventSafely({
    type: "CLIENT_CONFIRMATION_RECEIVED",
    idempotencyKey: `case:${current.id}:client_confirmation:${now.getTime()}`,
    aggregateId: current.id,
    payload: { caseId: current.id, confirmed: input.confirmed },
    correlationId: current.correlationId ?? undefined,
  });
  return updated;
}

export async function assignCase(input: {
  caseId: string;
  ownerUserId: string | null;
  actorUserId: string;
}) {
  const current = await db.case.findUnique({ where: { id: input.caseId } });
  if (!current) throw new CaseTransitionError("Case not found", 404);
  if (input.ownerUserId) {
    const owner = await db.user.findUnique({
      where: { id: input.ownerUserId },
      select: { id: true, disabledAt: true },
    });
    if (!owner || owner.disabledAt) {
      throw new CaseTransitionError("Owner must be an active user", 400);
    }
  }

  const updated = await db.$transaction(async (tx) => {
    const record = await tx.case.update({
      where: { id: current.id },
      data: { ownerUserId: input.ownerUserId },
    });
    await tx.caseActivity.create({
      data: {
        id: randomUUID(),
        caseId: current.id,
        type: "assigned",
        actorType: "user",
        actorUserId: input.actorUserId,
        metadata: {
          fromOwnerUserId: current.ownerUserId,
          toOwnerUserId: input.ownerUserId,
        },
      },
    });
    await tx.task.updateMany({
      where: { caseId: current.id, status: "open", assigneeUserId: null },
      data: { assigneeUserId: input.ownerUserId },
    });
    return record;
  });

  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "case.assigned",
    resourceType: "Case",
    resourceId: current.id,
    before: { ownerUserId: current.ownerUserId },
    after: { ownerUserId: updated.ownerUserId },
    source: "api",
    correlationId: current.correlationId ?? undefined,
  });
  return updated;
}
