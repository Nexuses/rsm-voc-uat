import { writeAuditLog } from "@/lib/audit";
import { HttpError } from "@/lib/api/http-error";
import { db } from "@/lib/db";
import { queueApprovedMessage } from "@/lib/messaging/deliveries";

export class ApprovalError extends HttpError {}

export async function listApprovals(status: "pending" | "decided", limit = 100) {
  return db.approvalRequest.findMany({
    where: status === "pending" ? { status: "pending" } : { status: { not: "pending" } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      status: true,
      resourceType: true,
      resourceId: true,
      payload: true,
      requestedByType: true,
      decidedByUserId: true,
      decidedAt: true,
      decisionNote: true,
      createdAt: true,
    },
  });
}

export async function decideApproval(input: {
  id: string;
  decision: "approved" | "rejected";
  note?: string;
  actorUserId: string;
}) {
  const changed = await db.approvalRequest.updateMany({
    where: { id: input.id, status: "pending" },
    data: {
      status: input.decision,
      decidedByUserId: input.actorUserId,
      decidedAt: new Date(),
      decisionNote: input.note ?? null,
    },
  });
  const approval = await db.approvalRequest.findUnique({ where: { id: input.id } });
  if (!approval) throw new ApprovalError("Approval not found", 404);
  if (!changed.count) throw new ApprovalError(`Already ${approval.status}`, 409);

  let deliveryId: string | null = null;
  if (input.decision === "approved" && approval.kind === "message_send") {
    deliveryId = (await queueApprovedMessage(approval)).id;
  }
  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "approval.decided",
    resourceType: "ApprovalRequest",
    resourceId: approval.id,
    metadata: { decision: input.decision, kind: approval.kind, deliveryId },
    source: "api",
    correlationId: approval.correlationId,
  });
  return { ...approval, deliveryId };
}
