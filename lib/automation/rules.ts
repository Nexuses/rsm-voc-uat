import { randomUUID } from "node:crypto";
import { HttpError } from "@/lib/api/http-error";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { automationActionsSchema } from "@/lib/automation/actions";
import { conditionSchema } from "@/lib/automation/conditions";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { isDomainEventType } from "@/lib/events/catalog";

export const ruleVersionInputSchema = z.object({
  eventType: z.string().refine(isDomainEventType, "Unknown event type"),
  conditions: conditionSchema,
  actions: automationActionsSchema,
  delayMinutes: z.number().int().min(0).max(60 * 24 * 30).default(0),
  mode: z.enum(["shadow", "live"]).default("shadow"),
});

export const createRuleInputSchema = ruleVersionInputSchema.extend({
  key: z.string().regex(/^[a-z][a-z0-9_.-]{2,79}$/),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional(),
});

export class RuleError extends HttpError {}

export async function listRules() {
  const rules = await db.automationRule.findMany({
    orderBy: { createdAt: "asc" },
    include: { versions: { orderBy: { version: "desc" } } },
  });
  const executions = await db.automationExecution.groupBy({
    by: ["ruleKey", "outcome"],
    where: { ruleKey: { in: rules.map((rule) => rule.key) } },
    _count: { _all: true },
  });
  return rules.map((rule) => ({
    ...rule,
    outcomes: Object.fromEntries(
      executions
        .filter((row) => row.ruleKey === rule.key)
        .map((row) => [row.outcome, row._count._all])
    ),
  }));
}

export async function recentExecutions(limit = 50) {
  return db.automationExecution.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      ruleKey: true,
      ruleVersion: true,
      mode: true,
      outcome: true,
      detail: true,
      createdAt: true,
      domainEvent: { select: { type: true } },
    },
  });
}

function versionData(input: z.infer<typeof ruleVersionInputSchema>) {
  return {
    eventType: input.eventType,
    conditions: input.conditions as Prisma.InputJsonValue,
    actions: input.actions as Prisma.InputJsonValue,
    delayMinutes: input.delayMinutes,
    mode: input.mode,
  };
}

export async function createRule(input: z.infer<typeof createRuleInputSchema>, actorUserId: string) {
  if (input.key.startsWith("builtin.")) {
    throw new RuleError("The builtin. prefix is reserved", 400);
  }
  if (await db.automationRule.findUnique({ where: { key: input.key } })) {
    throw new RuleError("A rule with this key already exists", 409);
  }
  const rule = await db.automationRule.create({
    data: {
      id: randomUUID(),
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      versions: {
        create: { id: randomUUID(), version: 1, createdByUserId: actorUserId, ...versionData(input) },
      },
    },
    include: { versions: true },
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: "automation.rule_created",
    resourceType: "AutomationRule",
    resourceId: rule.id,
    after: { key: rule.key, eventType: input.eventType, mode: input.mode },
    source: "api",
  });
  return rule;
}

export async function addRuleVersion(
  ruleId: string,
  input: z.infer<typeof ruleVersionInputSchema>,
  actorUserId: string
) {
  const latest = await db.automationRuleVersion.findFirst({
    where: { ruleId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  if (!latest) throw new RuleError("Rule not found", 404);
  const version = await db.automationRuleVersion.create({
    data: {
      id: randomUUID(),
      ruleId,
      version: latest.version + 1,
      createdByUserId: actorUserId,
      ...versionData(input),
    },
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: "automation.rule_version_created",
    resourceType: "AutomationRule",
    resourceId: ruleId,
    after: { version: version.version, eventType: input.eventType, mode: input.mode },
    source: "api",
  });
  return version;
}

/** Exactly one version is active per rule; older active versions retire. */
export async function activateRuleVersion(ruleId: string, versionId: string, actorUserId: string) {
  const version = await db.automationRuleVersion.findFirst({ where: { id: versionId, ruleId } });
  if (!version) throw new RuleError("Rule version not found", 404);
  await db.$transaction([
    db.automationRuleVersion.updateMany({
      where: { ruleId, status: "active", id: { not: versionId } },
      data: { status: "retired" },
    }),
    db.automationRuleVersion.update({ where: { id: versionId }, data: { status: "active" } }),
    db.automationRule.update({ where: { id: ruleId }, data: { active: true } }),
  ]);
  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: "automation.rule_activated",
    resourceType: "AutomationRule",
    resourceId: ruleId,
    after: { version: version.version, mode: version.mode },
    source: "api",
  });
}

export async function deactivateRule(ruleId: string, actorUserId: string) {
  const rule = await db.automationRule.findUnique({ where: { id: ruleId } });
  if (!rule) throw new RuleError("Rule not found", 404);
  await db.automationRule.update({ where: { id: ruleId }, data: { active: false } });
  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: "automation.rule_deactivated",
    resourceType: "AutomationRule",
    resourceId: ruleId,
    source: "api",
  });
}
