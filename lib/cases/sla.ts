import { randomUUID } from "node:crypto";
import { writeAuditLog } from "@/lib/audit";
import { OPEN_CASE_STATUSES } from "@/lib/cases/state";
import { db } from "@/lib/db";
import { emitEvent } from "@/lib/events/emit";

/**
 * Marks open cases past their SLA as breached, once per case. The event
 * idempotency key is the guard: a case already recorded is skipped.
 */
export async function handleSlaMonitor(now = new Date()) {
  const overdue = await db.case.findMany({
    where: { status: { in: OPEN_CASE_STATUSES }, slaDueAt: { lt: now } },
    select: { id: true, slaDueAt: true, correlationId: true, ownerUserId: true },
    take: 500,
  });

  let breached = 0;
  for (const record of overdue) {
    const idempotencyKey = `case:${record.id}:sla_breached`;
    if (await db.domainEvent.findUnique({ where: { idempotencyKey } })) continue;

    await emitEvent({
      type: "CASE_SLA_BREACHED",
      idempotencyKey,
      aggregateId: record.id,
      payload: { caseId: record.id, slaDueAt: record.slaDueAt!.toISOString() },
      correlationId: record.correlationId ?? undefined,
    });
    await db.caseActivity.create({
      data: {
        id: randomUUID(),
        caseId: record.id,
        type: "sla_breached",
        actorType: "system",
        metadata: { slaDueAt: record.slaDueAt!.toISOString() },
      },
    });
    await db.escalation.createMany({
      data: [
        {
          id: randomUUID(),
          caseId: record.id,
          level: 1,
          reason: "sla_breached",
          escalatedToUserId: null,
        },
      ],
      skipDuplicates: true,
    });
    await writeAuditLog({
      actorType: "system",
      action: "case.sla_breached",
      resourceType: "Case",
      resourceId: record.id,
      metadata: { slaDueAt: record.slaDueAt!.toISOString() },
      source: "worker",
      correlationId: record.correlationId,
    });
    breached += 1;
  }
  return { checked: overdue.length, breached };
}
