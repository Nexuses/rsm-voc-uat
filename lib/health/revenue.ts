import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";

export const revenueInputSchema = z.object({
  period: z.string().regex(/^\d{4}-(Q[1-4]|\d{2})$/, "Use YYYY-Qn or YYYY-MM"),
  amount: z.number().min(0).max(1e12),
  currency: z.string().regex(/^[A-Z]{3}$/).default("KWD"),
});

export async function listRevenue(accountId: string) {
  const rows = await db.revenueSnapshot.findMany({
    where: { accountId },
    orderBy: { period: "desc" },
    select: { period: true, amount: true, currency: true, source: true, createdAt: true },
  });
  return rows.map((row) => ({ ...row, amount: row.amount.toString() }));
}

export async function recordManualRevenue(
  accountId: string,
  input: z.infer<typeof revenueInputSchema>,
  actorUserId: string
) {
  const amount = new Prisma.Decimal(input.amount.toFixed(2));
  const existing = await db.revenueSnapshot.findUnique({
    where: { accountId_period_source: { accountId, period: input.period, source: "manual" } },
  });
  const row = await db.revenueSnapshot.upsert({
    where: { accountId_period_source: { accountId, period: input.period, source: "manual" } },
    create: {
      id: randomUUID(),
      accountId,
      period: input.period,
      amount,
      currency: input.currency,
      source: "manual",
    },
    update: { amount, currency: input.currency },
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: "revenue.recorded",
    resourceType: "Account",
    resourceId: accountId,
    before: existing ? { period: existing.period, amount: existing.amount.toString() } : undefined,
    after: { period: row.period, amount: row.amount.toString(), currency: row.currency },
    source: "api",
  });
  return { ...row, amount: row.amount.toString() };
}
