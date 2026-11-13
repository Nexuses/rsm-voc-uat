import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { OPEN_CASE_STATUSES } from "@/lib/cases/state";
import { db } from "@/lib/db";
import { emitEventSafely } from "@/lib/events/emit";
import { getFlagMode } from "@/lib/flags";
import {
  computeAccountHealth,
  DEFAULT_HEALTH_MODEL,
  healthModelConfigSchema,
} from "@/lib/health/model";

export async function ensureActiveHealthModel() {
  const active = await db.healthModel.findFirst({
    where: { active: true },
    orderBy: { version: "desc" },
  });
  if (active) return active;
  return db.healthModel.upsert({
    where: {
      key_version: { key: DEFAULT_HEALTH_MODEL.key, version: DEFAULT_HEALTH_MODEL.version },
    },
    create: {
      id: randomUUID(),
      key: DEFAULT_HEALTH_MODEL.key,
      version: DEFAULT_HEALTH_MODEL.version,
      config: DEFAULT_HEALTH_MODEL.config as Prisma.InputJsonValue,
    },
    update: {},
  });
}

export async function refreshAccountHealth(now = new Date()) {
  const mode = await getFlagMode("accounts.health");
  if (mode === "off") return { accounts: 0, changed: 0 };

  const model = await ensureActiveHealthModel();
  const config = healthModelConfigSchema.parse(model.config);
  const since = new Date(now.getTime() - config.lookbackDays * 24 * 60 * 60 * 1000);

  const accounts = await db.account.findMany({ select: { id: true } });
  let changed = 0;
  for (const account of accounts) {
    const [responses, openCases, previous] = await Promise.all([
      db.response.findMany({
        where: {
          accountId: account.id,
          excludedAt: null,
          OR: [{ completedAt: { gte: since } }, { completedAt: null, createdAt: { gte: since } }],
        },
        select: {
          csatScore: true,
          cesScore: true,
          npsScore: true,
          client: { select: { contactRole: { select: { stakeholderWeight: true } } } },
        },
      }),
      db.case.count({
        where: { status: { in: OPEN_CASE_STATUSES }, response: { accountId: account.id } },
      }),
      db.healthSnapshot.findFirst({
        where: { accountId: account.id },
        orderBy: { computedAt: "desc" },
        select: { state: true },
      }),
    ]);

    const result = computeAccountHealth({
      responses: responses.map((r) => ({
        csat: r.csatScore,
        ces: r.cesScore,
        nps: r.npsScore,
        weight: r.client?.contactRole?.stakeholderWeight ?? 1,
      })),
      openCases,
      config,
    });

    await db.healthSnapshot.create({
      data: {
        id: randomUUID(),
        accountId: account.id,
        healthModelId: model.id,
        score: result.score,
        state: result.state,
        components: { ...result.components, surveyed: result.surveyed } as Prisma.InputJsonValue,
        computedAt: now,
      },
    });

    if (previous?.state !== result.state) {
      changed += 1;
      if (mode === "live") {
        await emitEventSafely({
          type: "HEALTH_STATE_CHANGED",
          idempotencyKey: `account:${account.id}:health:${now.toISOString().slice(0, 10)}:${result.state}`,
          aggregateId: account.id,
          payload: {
            accountId: account.id,
            fromState: previous?.state ?? null,
            toState: result.state,
          },
        });
      }
    }
  }
  return { accounts: accounts.length, changed };
}

export async function getAccountHealthHistory(accountId: string, limit = 30) {
  return db.healthSnapshot.findMany({
    where: { accountId },
    orderBy: { computedAt: "desc" },
    take: limit,
    select: { score: true, state: true, components: true, computedAt: true },
  });
}
