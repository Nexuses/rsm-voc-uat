/**
 * Recalculate stored ResponseInsight.overallSentiment from the combined
 * survey score out of 22 (CSAT + CES + NPS):
 * below 60% negative, 60–80% neutral, above 80% positive.
 *
 * Dashboard/API reads already derive sentiment from scores at read time, so
 * this script only aligns the stored GPT label with the deterministic rule
 * (used for exports/AI context fallbacks and future reads).
 *
 * Dry run (default, read-only):
 *   npx tsx scripts/recalculate-overall-sentiment.mts
 * Apply:
 *   npx tsx scripts/recalculate-overall-sentiment.mts --apply
 */
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const apply = process.argv.includes("--apply");

const { db } = await import("../lib/db");
const { combinedSurveyScore, overallSentimentFromScores } = await import(
  "../lib/survey/metrics"
);

const responses = await db.response.findMany({
  where: { csatScore: { not: null }, cesScore: { not: null }, npsScore: { not: null } },
  orderBy: { createdAt: "asc" },
  select: {
    id: true,
    csatScore: true,
    cesScore: true,
    npsScore: true,
    insight: { select: { overallSentiment: true } },
  },
});

let complete = 0;
let alreadyAligned = 0;
let wouldUpdate = 0;
let updated = 0;
let missingInsight = 0;
const transitions: Record<string, number> = {};

for (const response of responses) {
  const sentiment = overallSentimentFromScores(response);
  const combined = combinedSurveyScore(response);
  if (!sentiment || !combined) continue;
  complete += 1;
  if (!response.insight) {
    missingInsight += 1;
    continue;
  }
  if (response.insight.overallSentiment === sentiment) {
    alreadyAligned += 1;
    continue;
  }
  wouldUpdate += 1;
  const key = `${response.insight.overallSentiment} -> ${sentiment} (${combined.total}/22)`;
  transitions[key] = (transitions[key] ?? 0) + 1;
  if (apply) {
    await db.responseInsight.update({
      where: { responseId: response.id },
      data: { overallSentiment: sentiment },
    });
    updated += 1;
  }
}

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      completeResponses: complete,
      alreadyAligned,
      wouldUpdate,
      updated,
      missingInsight,
      transitions,
    },
    null,
    2
  )
);

await db.$disconnect();
