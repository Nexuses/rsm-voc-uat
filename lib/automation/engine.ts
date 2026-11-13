import { randomUUID } from "node:crypto";
import type { DomainEvent, Prisma } from "@prisma/client";
import { automationActionsSchema, type AutomationAction } from "@/lib/automation/actions";
import { conditionSchema, evaluateCondition, type Facts } from "@/lib/automation/conditions";
import { usersWithPermission } from "@/lib/automation/recipients";
import { db } from "@/lib/db";
import { getFlagMode, type FlagMode } from "@/lib/flags";
import { enqueueJob, type ClaimedJob } from "@/lib/jobs/queue";
import { attentionMetrics, builtInDefinitionForSurveyVersion, scoreResponse } from "@/lib/scoring";

export const DELAYED_RULE_JOB_TYPE = "automation.evaluate_version";

type RuleVersionRow = {
  id: string;
  version: number;
  eventType: string;
  conditions: Prisma.JsonValue;
  actions: Prisma.JsonValue;
  delayMinutes: number;
  mode: string;
  rule: { key: string };
};

/**
 * Facts carry ids, scores, and flags only — never contact details — so rule
 * conditions and execution logs cannot leak PII.
 */
export async function buildFacts(event: DomainEvent): Promise<Facts> {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const facts: Facts = { event: { type: event.type, ...payload } };

  const responseId = typeof payload.responseId === "string" ? payload.responseId : null;
  if (responseId) {
    const response = await db.response.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        surveyVersion: true,
        language: true,
        csatScore: true,
        cesScore: true,
        npsScore: true,
        excludedAt: true,
        accountId: true,
        client: { select: { tier: true } },
      },
    });
    if (response) {
      const scores = scoreResponse(
        response,
        builtInDefinitionForSurveyVersion(response.surveyVersion).config
      );
      facts.response = {
        id: response.id,
        surveyVersion: response.surveyVersion,
        language: response.language,
        csat: response.csatScore,
        ces: response.cesScore,
        nps: response.npsScore,
        excluded: Boolean(response.excludedAt),
        attentionMetrics: attentionMetrics(scores),
        clientTier: response.client?.tier ?? null,
      };
      facts.accountId = response.accountId;
    }
  }
  if (typeof payload.accountId === "string") facts.accountId = payload.accountId;
  return facts;
}

async function claim(ruleKey: string, version: number, event: DomainEvent, mode: FlagMode) {
  await db.automationExecution.createMany({
    data: [
      {
        id: randomUUID(),
        ruleKey,
        ruleVersion: version,
        domainEventId: event.id,
        mode,
        outcome: "pending",
        correlationId: event.correlationId,
      },
    ],
    skipDuplicates: true,
  });
  return db.automationExecution.findUniqueOrThrow({
    where: {
      ruleKey_ruleVersion_domainEventId: { ruleKey, ruleVersion: version, domainEventId: event.id },
    },
  });
}

async function finish(id: string, outcome: string, detail: Prisma.InputJsonValue) {
  await db.automationExecution.update({ where: { id }, data: { outcome, detail } });
}

async function runAction(
  action: AutomationAction,
  context: { executionId: string; event: DomainEvent; facts: Facts; ruleKey: string }
) {
  const accountId = typeof context.facts.accountId === "string" ? context.facts.accountId : null;
  const responseId =
    (context.facts.response as { id?: string } | undefined)?.id ?? null;

  if (action.type === "create_task") {
    const task = await db.task.create({
      data: {
        id: randomUUID(),
        title: action.title,
        dueAt: action.dueInHours
          ? new Date(Date.now() + action.dueInHours * 60 * 60 * 1000)
          : null,
      },
    });
    return { type: action.type, taskId: task.id };
  }

  if (action.type === "notify") {
    const userIds = await usersWithPermission(action.permission, accountId);
    if (userIds.length) {
      await db.notification.createMany({
        data: userIds.map((userId) => ({
          id: randomUUID(),
          userId,
          kind: `automation:${context.ruleKey}`,
          title: action.title,
          body: action.body ?? null,
          link: accountId ? `/dashboard/clients/${accountId}` : "/dashboard/responses",
        })),
      });
    }
    return { type: action.type, recipients: userIds.length };
  }

  const approval = await db.approvalRequest.create({
    data: {
      id: randomUUID(),
      kind: "message_send",
      resourceType: responseId ? "Response" : accountId ? "Account" : null,
      resourceId: responseId ?? accountId,
      payload: {
        templateKey: action.templateKey,
        channel: action.channel,
        responseId,
        accountId,
        automationExecutionId: context.executionId,
      },
      requestedByType: "system",
      correlationId: context.event.correlationId,
    },
  });
  return { type: action.type, approvalRequestId: approval.id };
}

export async function evaluateRuleVersion(
  version: RuleVersionRow,
  event: DomainEvent,
  globalMode: FlagMode,
  facts?: Facts
) {
  const mode: FlagMode = globalMode === "live" && version.mode === "live" ? "live" : "shadow";
  const execution = await claim(version.rule.key, version.version, event, mode);
  if (execution.outcome !== "pending") return execution.outcome;

  const conditions = conditionSchema.safeParse(version.conditions);
  const actions = automationActionsSchema.safeParse(version.actions);
  if (!conditions.success || !actions.success) {
    await finish(execution.id, "failed", { reason: "invalid_rule_definition" });
    return "failed";
  }

  const resolvedFacts = facts ?? (await buildFacts(event));
  if (!evaluateCondition(conditions.data, resolvedFacts)) {
    await finish(execution.id, "not_matched", {});
    return "not_matched";
  }
  if (execution.mode !== "live") {
    await finish(execution.id, "matched_shadow", {
      intendedActions: actions.data.map((action) => action.type),
    });
    return "matched_shadow";
  }

  const results = [];
  for (const action of actions.data) {
    results.push(
      await runAction(action, {
        executionId: execution.id,
        event,
        facts: resolvedFacts,
        ruleKey: version.rule.key,
      })
    );
  }
  await finish(execution.id, "actions_executed", { results });
  return "actions_executed";
}

const ruleVersionSelect = {
  id: true,
  version: true,
  eventType: true,
  conditions: true,
  actions: true,
  delayMinutes: true,
  mode: true,
  rule: { select: { key: true } },
} as const;

export async function handleAutomationEvaluate(job: ClaimedJob) {
  const payload = job.payload as { domainEventId?: string } | null;
  if (!payload?.domainEventId) throw new Error("automation.evaluate: missing domainEventId");
  const globalMode = await getFlagMode("automation.rules");
  if (globalMode === "off") return;

  const event = await db.domainEvent.findUnique({ where: { id: payload.domainEventId } });
  if (!event) throw new Error(`automation.evaluate: event ${payload.domainEventId} not found`);

  const versions = await db.automationRuleVersion.findMany({
    where: { eventType: event.type, status: "active", rule: { active: true } },
    select: ruleVersionSelect,
  });
  if (!versions.length) return;

  const facts = await buildFacts(event);
  for (const version of versions) {
    if (version.delayMinutes > 0) {
      await enqueueJob({
        type: DELAYED_RULE_JOB_TYPE,
        jobKey: `${DELAYED_RULE_JOB_TYPE}:${version.id}:${event.id}`,
        payload: { domainEventId: event.id, ruleVersionId: version.id },
        runAt: new Date(event.occurredAt.getTime() + version.delayMinutes * 60 * 1000),
        correlationId: event.correlationId,
      });
      continue;
    }
    await evaluateRuleVersion(version, event, globalMode, facts);
  }
}

/** Delayed rules re-read facts at run time so they see the latest state. */
export async function handleDelayedRuleVersion(job: ClaimedJob) {
  const payload = job.payload as { domainEventId?: string; ruleVersionId?: string } | null;
  if (!payload?.domainEventId || !payload.ruleVersionId) {
    throw new Error("automation.evaluate_version: missing ids");
  }
  const globalMode = await getFlagMode("automation.rules");
  if (globalMode === "off") return;
  const [event, version] = await Promise.all([
    db.domainEvent.findUnique({ where: { id: payload.domainEventId } }),
    db.automationRuleVersion.findFirst({
      where: { id: payload.ruleVersionId, status: "active", rule: { active: true } },
      select: ruleVersionSelect,
    }),
  ]);
  if (!event || !version) return;
  await evaluateRuleVersion(version, event, globalMode);
}

/** Read-only dry run against recent events: nothing is written. */
export async function dryRunRule(input: {
  eventType: string;
  conditions: unknown;
  limit: number;
}) {
  const conditions = conditionSchema.parse(input.conditions);
  const events = await db.domainEvent.findMany({
    where: { type: input.eventType },
    orderBy: { occurredAt: "desc" },
    take: input.limit,
  });
  let matched = 0;
  const sample: Array<{ eventId: string; occurredAt: Date }> = [];
  for (const event of events) {
    if (evaluateCondition(conditions, await buildFacts(event))) {
      matched += 1;
      if (sample.length < 10) sample.push({ eventId: event.id, occurredAt: event.occurredAt });
    }
  }
  return { evaluated: events.length, matched, sample };
}
