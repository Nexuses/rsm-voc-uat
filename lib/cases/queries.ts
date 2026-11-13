import type { Prisma } from "@prisma/client";
import { caseScopeWhere, type AuthzContext } from "@/lib/authz";
import {
  BOARD_CASE_STATUSES,
  OPEN_CASE_STATUSES,
  allowedTransitions,
  closeBlockedReason,
  type CaseStatus,
} from "@/lib/cases/state";
import { db } from "@/lib/db";

export const CASE_VIEWS = ["open", "mine", "breached", "all", "board"] as const;
export type CaseView = (typeof CASE_VIEWS)[number];

export { BOARD_CASE_STATUSES };

export function isCaseView(value: string | null | undefined): value is CaseView {
  return (CASE_VIEWS as readonly string[]).includes(value ?? "");
}

function whereForView(view: CaseView, userId: string, now: Date): Prisma.CaseWhereInput {
  switch (view) {
    case "mine":
      return { ownerUserId: userId, status: { in: OPEN_CASE_STATUSES } };
    case "breached":
      return { status: { in: OPEN_CASE_STATUSES }, slaDueAt: { lt: now } };
    case "all":
      return {};
    case "board":
      return { status: { in: BOARD_CASE_STATUSES } };
    default:
      return { status: { in: OPEN_CASE_STATUSES } };
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function transitionsFor(row: {
  status: string;
  requiresClientConfirmation: boolean;
  clientConfirmedAt: Date | null;
}) {
  return allowedTransitions(row.status).filter(
    (to) =>
      !closeBlockedReason({
        from: row.status,
        to,
        requiresClientConfirmation: row.requiresClientConfirmation,
        clientConfirmedAt: row.clientConfirmedAt,
      })
  );
}

export type CaseListRow = {
  id: string;
  number: number;
  title: string;
  status: string;
  severity: string;
  source: string;
  slaDueAt: string | null;
  slaBreached: boolean;
  createdAt: string;
  ownerEmail: string | null;
  clientName: string | null;
  company: string | null;
  department: string | null;
  partner: string | null;
  csatScore: number | null;
  cesScore: number | null;
  npsScore: number | null;
  triggerMetrics: string[];
  taskTitle: string | null;
  allowedTransitions: CaseStatus[];
};

export async function listCases(input: {
  ctx: AuthzContext;
  view: CaseView;
  limit?: number;
  cursor?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const defaultLimit = input.view === "board" ? 200 : 50;
  const limit = Math.min(Math.max(input.limit ?? defaultLimit, 1), 200);
  const rows = await db.case.findMany({
    where: {
      AND: [whereForView(input.view, input.ctx.userId, now), caseScopeWhere(input.ctx)],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      severity: true,
      source: true,
      slaDueAt: true,
      createdAt: true,
      triggerMetrics: true,
      requiresClientConfirmation: true,
      clientConfirmedAt: true,
      owner: { select: { email: true } },
      tasks: {
        where: { status: "open" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { title: true },
      },
      response: {
        select: {
          csatScore: true,
          cesScore: true,
          npsScore: true,
          client: { select: { name: true, company: true } },
          surveyInvite: { select: { department: true, partner: true } },
        },
      },
    },
  });

  const page = rows.slice(0, limit);
  return {
    cases: page.map(
      (row): CaseListRow => ({
        id: row.id,
        number: row.number,
        title: row.title,
        status: row.status,
        severity: row.severity,
        source: row.source,
        slaDueAt: row.slaDueAt?.toISOString() ?? null,
        slaBreached: Boolean(
          row.slaDueAt &&
            row.slaDueAt < now &&
            (OPEN_CASE_STATUSES as string[]).includes(row.status)
        ),
        createdAt: row.createdAt.toISOString(),
        ownerEmail: row.owner?.email ?? null,
        clientName: row.response?.client?.name ?? null,
        company: row.response?.client?.company ?? null,
        department: row.response?.surveyInvite?.department?.trim() || null,
        partner: row.response?.surveyInvite?.partner?.trim() || null,
        csatScore: row.response?.csatScore ?? null,
        cesScore: row.response?.cesScore ?? null,
        npsScore: row.response?.npsScore ?? null,
        triggerMetrics: asStringArray(row.triggerMetrics),
        taskTitle: row.tasks[0]?.title ?? null,
        allowedTransitions: transitionsFor(row),
      })
    ),
    nextCursor: rows.length > limit ? page[page.length - 1]?.id ?? null : null,
  };
}

export async function getCaseDetail(ctx: AuthzContext, id: string) {
  const record = await db.case.findFirst({
    where: { AND: [{ id }, caseScopeWhere(ctx)] },
    include: {
      owner: { select: { id: true, email: true } },
      slaPolicy: { select: { name: true, firstResponseHours: true, resolutionHours: true } },
      response: {
        select: {
          id: true,
          csatScore: true,
          cesScore: true,
          npsScore: true,
          completedAt: true,
          language: true,
          client: { select: { name: true, company: true } },
          surveyInvite: { select: { department: true, partner: true, email: true } },
        },
      },
      activities: { orderBy: { createdAt: "asc" } },
      escalations: { orderBy: { createdAt: "asc" } },
      tasks: {
        orderBy: { createdAt: "asc" },
        include: { assignee: { select: { email: true } } },
      },
    },
  });
  if (!record) return null;

  const actorIds = [
    ...new Set(record.activities.map((a) => a.actorUserId).filter(Boolean)),
  ] as string[];
  const actors = actorIds.length
    ? await db.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, email: true },
      })
    : [];
  const actorEmail = new Map(actors.map((actor) => [actor.id, actor.email]));

  return {
    id: record.id,
    number: record.number,
    title: record.title,
    status: record.status,
    severity: record.severity,
    priority: record.priority,
    source: record.source,
    triggerMetrics: asStringArray(record.triggerMetrics),
    slaDueAt: record.slaDueAt?.toISOString() ?? null,
    slaPolicy: record.slaPolicy,
    firstRespondedAt: record.firstRespondedAt?.toISOString() ?? null,
    resolvedAt: record.resolvedAt?.toISOString() ?? null,
    closedAt: record.closedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    owner: record.owner,
    allowedTransitions: transitionsFor(record),
    requiresClientConfirmation: record.requiresClientConfirmation,
    clientConfirmedAt: record.clientConfirmedAt?.toISOString() ?? null,
    clientConfirmationNote: record.clientConfirmationNote,
    escalations: record.escalations.map((escalation) => ({
      id: escalation.id,
      level: escalation.level,
      reason: escalation.reason,
      createdAt: escalation.createdAt.toISOString(),
    })),
    response: record.response
      ? {
          id: record.response.id,
          csatScore: record.response.csatScore,
          cesScore: record.response.cesScore,
          npsScore: record.response.npsScore,
          completedAt: record.response.completedAt?.toISOString() ?? null,
          language: record.response.language,
          clientName: record.response.client?.name ?? null,
          company: record.response.client?.company ?? null,
          department: record.response.surveyInvite?.department?.trim() || null,
          partner: record.response.surveyInvite?.partner?.trim() || null,
          email: record.response.surveyInvite?.email?.trim() || null,
        }
      : null,
    activities: record.activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      actorType: activity.actorType,
      actorEmail: activity.actorUserId
        ? actorEmail.get(activity.actorUserId) ?? null
        : null,
      fromStatus: activity.fromStatus,
      toStatus: activity.toStatus,
      message: activity.message,
      createdAt: activity.createdAt.toISOString(),
    })),
    tasks: record.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      dueAt: task.dueAt?.toISOString() ?? null,
      assigneeEmail: task.assignee?.email ?? null,
    })),
  };
}

export type CaseDetail = NonNullable<Awaited<ReturnType<typeof getCaseDetail>>>;
