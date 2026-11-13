/**
 * Evaluate historical responses against the built-in needs-attention rule.
 *
 * Dry run (default, read-only): prints how many cases the rule would open and
 * compares that with the needs-attention emails already sent
 * (Response.teamNotifySentAt). Both counts must agree before switching
 * `cases.auto_create` to live.
 *
 * Apply (`--apply`): opens missing Cases directly (idempotent via dedupeKey)
 * so the Escalations board is populated even when SURVEY_RESPONSE_SUBMITTED
 * already ran in shadow mode. Also emits submit events for responses that
 * never had one.
 *
 *   npx tsx scripts/backfill-case-evaluation.mts
 *   npx tsx scripts/backfill-case-evaluation.mts --apply
 */
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const apply = process.argv.includes("--apply");

const { db } = await import("../lib/db");
const { attentionMetrics, builtInDefinitionForSurveyVersion, scoreResponse } =
  await import("../lib/scoring");
const { needsAttentionScores } = await import("../lib/survey/metrics");
const { emitEvent } = await import("../lib/events/emit");
const { TYPED_CONVERSATION_PREFIX } = await import("../lib/survey/constants");
const {
  createNeedsAttentionCase,
  needsAttentionDedupeKey,
} = await import("../lib/cases/service");
const { severityForAttentionMetrics } = await import("../lib/cases/state");
const { NEEDS_ATTENTION_RULE } = await import("../lib/jobs/score-and-evaluate");

const responses = await db.response.findMany({
  where: { excludedAt: null, completedAt: { not: null } },
  orderBy: { completedAt: "asc" },
  select: {
    id: true,
    conversationId: true,
    surveyVersion: true,
    csatScore: true,
    cesScore: true,
    npsScore: true,
    teamNotifySentAt: true,
  },
});

let wouldOpen = 0;
let legacyNeedsAttention = 0;
let notifiedNeedsAttention = 0;
let mismatches = 0;
let emitted = 0;
let casesCreated = 0;
let casesExisting = 0;

for (const response of responses) {
  const definition = builtInDefinitionForSurveyVersion(response.surveyVersion);
  const metrics = attentionMetrics(scoreResponse(response, definition.config));
  const legacy = needsAttentionScores(response);
  if (metrics.length) wouldOpen += 1;
  if (legacy.length) legacyNeedsAttention += 1;
  if (legacy.length && response.teamNotifySentAt) notifiedNeedsAttention += 1;
  if (metrics.join() !== legacy.join() && definition.key === "three-metric") {
    mismatches += 1;
  }

  if (!apply || !metrics.length) continue;

  const event = await emitEvent({
    type: "SURVEY_RESPONSE_SUBMITTED",
    idempotencyKey: `response:${response.id}:submitted`,
    aggregateId: response.id,
    payload: {
      responseId: response.id,
      surveyVersion: response.surveyVersion,
      source: response.conversationId.startsWith(TYPED_CONVERSATION_PREFIX)
        ? "typed"
        : "voice",
    },
  });
  if (event) emitted += 1;

  const existing = await db.case.findUnique({
    where: { dedupeKey: needsAttentionDedupeKey(response.id) },
  });
  if (existing) {
    casesExisting += 1;
    continue;
  }

  const severity = severityForAttentionMetrics(metrics);
  const domainEventId = event?.id ?? `backfill:${response.id}`;
  const executionId = randomUUID();
  await db.automationExecution.createMany({
    data: [
      {
        id: executionId,
        ruleKey: NEEDS_ATTENTION_RULE.key,
        ruleVersion: NEEDS_ATTENTION_RULE.version,
        domainEventId,
        mode: "live",
        outcome: "pending",
        correlationId: event?.correlationId ?? null,
      },
    ],
    skipDuplicates: true,
  });
  const execution = await db.automationExecution.findFirst({
    where: {
      OR: [
        { id: executionId },
        {
          ruleKey: NEEDS_ATTENTION_RULE.key,
          ruleVersion: NEEDS_ATTENTION_RULE.version,
          domainEventId,
        },
      ],
    },
  });
  if (!execution) continue;

  const result = await createNeedsAttentionCase({
    responseId: response.id,
    automationExecutionId: execution.id,
    metrics,
    severity,
    correlationId: event?.correlationId ?? null,
  });
  await db.automationExecution.update({
    where: { id: execution.id },
    data: {
      outcome: result.created ? "case_created" : "case_exists",
      detail: {
        responseId: response.id,
        metrics,
        severity,
        caseId: result.case.id,
        source: "cases:backfill",
      },
    },
  });
  if (result.created) casesCreated += 1;
  else casesExisting += 1;
}

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      responsesEvaluated: responses.length,
      wouldOpenCases: wouldOpen,
      legacyNeedsAttention,
      needsAttentionWithTeamEmail: notifiedNeedsAttention,
      thresholdMismatches: mismatches,
      eventsEmitted: emitted,
      casesCreated,
      casesExisting,
    },
    null,
    2
  )
);

await db.$disconnect();
