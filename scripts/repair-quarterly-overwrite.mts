/**
 * Re-apply per-email UTC-quarter soft-exclude for already-stored responses.
 * Use after fixing voice+invite overwrite resolution so older duplicates drop
 * out of KPIs.
 *
 *   npx tsx scripts/repair-quarterly-overwrite.mts
 */
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const { db } = await import("../lib/db");
const {
  excludePriorQuarterResponsesForEmail,
  resolveQuarterlyOverwriteEmail,
} = await import("../lib/survey/ingest");
const { recomputeAggregates } = await import("../lib/aggregate");

const responses = await db.response.findMany({
  where: {
    excludedAt: null,
    completedAt: { not: null },
  },
  orderBy: { completedAt: "desc" },
  select: {
    id: true,
    conversationId: true,
    completedAt: true,
    client: { select: { email: true } },
    surveyInvite: { select: { email: true, token: true } },
  },
});

let touched = 0;
for (const response of responses) {
  if (!response.completedAt) continue;
  const email = await resolveQuarterlyOverwriteEmail({
    email: response.client?.email ?? response.surveyInvite?.email,
    inviteToken: response.surveyInvite?.token,
    conversationId: response.conversationId,
    responseId: response.id,
  });
  const result = await excludePriorQuarterResponsesForEmail({
    keepResponseId: response.id,
    email,
    completedAt: response.completedAt,
  });
  if (result.excludedCount > 0) {
    touched += result.excludedCount;
    console.log(
      `Excluded ${result.excludedCount} prior response(s) for ${email ?? "unknown"} keeping ${response.id}`
    );
  }
}

if (touched > 0) {
  await recomputeAggregates();
  console.log(`Done. Soft-excluded ${touched} response(s) and recomputed aggregates.`);
} else {
  console.log("No duplicate-email responses needed soft-exclude.");
}

await db.$disconnect();
