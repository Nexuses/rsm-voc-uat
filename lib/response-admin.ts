import { recomputeAggregates } from "@/lib/aggregate";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";

export async function excludeSurveyResponse(input: {
  responseId: string;
  actorUserId: string;
  reason?: string | null;
}) {
  const existing = await db.response.findUnique({
    where: { id: input.responseId },
    select: { id: true, excludedAt: true, conversationId: true },
  });
  if (!existing) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (existing.excludedAt) {
    return { ok: true as const, alreadyExcluded: true as const };
  }

  await db.response.update({
    where: { id: input.responseId },
    data: {
      excludedAt: new Date(),
      excludedByUserId: input.actorUserId,
      exclusionReason: input.reason?.trim() || null,
    },
  });

  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "response.excluded",
    resourceType: "Response",
    resourceId: input.responseId,
    metadata: {
      conversationId: existing.conversationId,
      reason: input.reason?.trim() || null,
    },
  });

  await recomputeAggregates();
  return { ok: true as const, alreadyExcluded: false as const };
}

export type PublicVisibilityAction = "approve" | "hide" | "reset";

export async function setResponsePublicVisibility(input: {
  responseId: string;
  actorUserId: string;
  action: PublicVisibilityAction;
}) {
  const existing = await db.response.findUnique({
    where: { id: input.responseId },
    select: { id: true, publicApprovedAt: true, publicHiddenAt: true },
  });
  if (!existing) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const now = new Date();
  const data =
    input.action === "approve"
      ? { publicApprovedAt: now, publicHiddenAt: null }
      : input.action === "hide"
        ? { publicHiddenAt: now }
        : { publicApprovedAt: null, publicHiddenAt: null };

  await db.response.update({ where: { id: input.responseId }, data });

  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: `response.public_${input.action}`,
    resourceType: "Response",
    resourceId: input.responseId,
    before: {
      publicApproved: Boolean(existing.publicApprovedAt),
      publicHidden: Boolean(existing.publicHiddenAt),
    },
    after: {
      publicApproved: input.action === "approve",
      publicHidden: input.action === "hide",
    },
    source: "api",
  });

  await recomputeAggregates();
  return { ok: true as const };
}

export async function deleteSurveyResponse(input: {
  responseId: string;
  actorUserId: string;
}) {
  const existing = await db.response.findUnique({
    where: { id: input.responseId },
    select: { id: true, conversationId: true },
  });
  if (!existing) {
    return { ok: false as const, reason: "not_found" as const };
  }

  // Detach invite link first (1:1 optional) so invite history remains.
  await db.surveyInvite.updateMany({
    where: { responseId: input.responseId },
    data: { responseId: null, conversationId: null },
  });

  await db.response.delete({ where: { id: input.responseId } });

  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "response.deleted",
    resourceType: "Response",
    resourceId: input.responseId,
    metadata: { conversationId: existing.conversationId },
  });

  await recomputeAggregates();
  return { ok: true as const };
}
