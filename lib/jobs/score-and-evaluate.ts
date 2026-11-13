import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { createNeedsAttentionCase } from "@/lib/cases/service";
import { severityForAttentionMetrics } from "@/lib/cases/state";
import { db } from "@/lib/db";
import { getFlagMode, type FlagMode } from "@/lib/flags";
import type { ClaimedJob } from "@/lib/jobs/queue";
import {
  attentionMetrics,
  builtInDefinitionForSurveyVersion,
  scoreResponse,
  type BuiltInScoreDefinition,
  type MetricScore,
} from "@/lib/scoring";
import { toAnswerRows } from "@/lib/surveys/answers";

export const NEEDS_ATTENTION_RULE = { key: "builtin.needs_attention", version: 1 };

export type EvaluationOutcome =
  | "pending"
  | "skipped"
  | "not_matched"
  | "matched_shadow"
  | "case_created"
  | "case_exists";

export async function ensureScoreDefinitionRow(definition: BuiltInScoreDefinition) {
  return db.scoreDefinition.upsert({
    where: { key_version: { key: definition.key, version: definition.version } },
    create: {
      id: randomUUID(),
      key: definition.key,
      version: definition.version,
      surveyVersion: definition.surveyVersion,
      config: definition.config as Prisma.InputJsonValue,
    },
    update: {},
  });
}

async function writeScoreResults(
  responseId: string,
  scoreDefinitionId: string,
  scores: MetricScore[]
) {
  for (const score of scores) {
    const data = {
      value: score.value,
      band: score.band,
      needsAttention: score.needsAttention,
      weightedScore: score.weightedScore,
      computedAt: new Date(),
    };
    await db.scoreResult.upsert({
      where: {
        responseId_scoreDefinitionId_metric: {
          responseId,
          scoreDefinitionId,
          metric: score.metric,
        },
      },
      create: {
        id: randomUUID(),
        responseId,
        scoreDefinitionId,
        metric: score.metric,
        ...data,
      },
      update: data,
    });
  }
}

async function writeAnswerRows(responseId: string, surveyVersion: string | null, answers: unknown) {
  const rows = toAnswerRows(answers);
  if (!rows.length) return;
  const questions = surveyVersion
    ? await db.surveyQuestion.findMany({
        where: { surveyVersion: { versionKey: surveyVersion } },
        select: { id: true, questionKey: true },
      })
    : [];
  const questionIds = new Map(questions.map((q) => [q.questionKey, q.id]));
  for (const row of rows) {
    const data = {
      metric: row.metric,
      numericValue: row.numericValue,
      textValue: row.textValue,
      questionId: questionIds.get(row.questionKey) ?? null,
    };
    await db.responseAnswer.upsert({
      where: { responseId_questionKey: { responseId, questionKey: row.questionKey } },
      create: { id: randomUUID(), responseId, questionKey: row.questionKey, ...data },
      update: data,
    });
  }
}

/** Pure decision used by the handler and by the dry-run backfill. */
export function decideNeedsAttention(input: {
  mode: FlagMode;
  metrics: string[];
}): { outcome: "not_matched" | "matched_shadow" | "create_case" } {
  if (!input.metrics.length) return { outcome: "not_matched" };
  return { outcome: input.mode === "live" ? "create_case" : "matched_shadow" };
}

async function claimExecution(domainEventId: string, mode: FlagMode, correlationId: string | null) {
  await db.automationExecution.createMany({
    data: [
      {
        id: randomUUID(),
        ruleKey: NEEDS_ATTENTION_RULE.key,
        ruleVersion: NEEDS_ATTENTION_RULE.version,
        domainEventId,
        mode,
        outcome: "pending",
        correlationId,
      },
    ],
    skipDuplicates: true,
  });
  return db.automationExecution.findUniqueOrThrow({
    where: {
      ruleKey_ruleVersion_domainEventId: {
        ruleKey: NEEDS_ATTENTION_RULE.key,
        ruleVersion: NEEDS_ATTENTION_RULE.version,
        domainEventId,
      },
    },
  });
}

async function finishExecution(
  id: string,
  outcome: EvaluationOutcome,
  detail: Prisma.InputJsonValue
) {
  await db.automationExecution.update({
    where: { id },
    data: { outcome, detail },
  });
}

export async function handleScoreAndEvaluate(job: ClaimedJob) {
  const payload = job.payload as { domainEventId?: string } | null;
  if (!payload?.domainEventId) throw new Error("score_and_evaluate: missing domainEventId");

  const event = await db.domainEvent.findUnique({ where: { id: payload.domainEventId } });
  if (!event) throw new Error(`score_and_evaluate: event ${payload.domainEventId} not found`);
  const responseId = (event.payload as { responseId?: string }).responseId;
  if (!responseId) throw new Error("score_and_evaluate: event has no responseId");

  const response = await db.response.findUnique({
    where: { id: responseId },
    select: {
      id: true,
      surveyVersion: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
      excludedAt: true,
      answers: true,
    },
  });

  const definition = builtInDefinitionForSurveyVersion(response?.surveyVersion);
  const scores = response ? scoreResponse(response, definition.config) : [];
  if (response && !response.excludedAt && scores.length) {
    const row = await ensureScoreDefinitionRow(definition);
    await writeScoreResults(response.id, row.id, scores);
  }
  if (response && !response.excludedAt) {
    await writeAnswerRows(response.id, response.surveyVersion, response.answers);
  }

  const mode = await getFlagMode("cases.auto_create");
  if (mode === "off") return;

  const execution = await claimExecution(event.id, mode, event.correlationId);
  if (execution.outcome !== "pending") return;

  if (!response || response.excludedAt) {
    await finishExecution(execution.id, "skipped", {
      reason: response ? "excluded" : "response_missing",
    });
    return;
  }

  const metrics = attentionMetrics(scores);
  const severity = severityForAttentionMetrics(metrics);
  const decision = decideNeedsAttention({ mode: execution.mode as FlagMode, metrics });
  const detail = {
    responseId: response.id,
    scoreDefinition: `${definition.key}@${definition.version}`,
    metrics,
    severity: metrics.length ? severity : null,
  };

  if (decision.outcome !== "create_case") {
    await finishExecution(execution.id, decision.outcome, detail);
    return;
  }

  const result = await createNeedsAttentionCase({
    responseId: response.id,
    automationExecutionId: execution.id,
    metrics,
    severity,
    correlationId: event.correlationId,
  });
  await finishExecution(
    execution.id,
    result.created ? "case_created" : "case_exists",
    { ...detail, caseId: result.case.id }
  );
}
