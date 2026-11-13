import { db } from "@/lib/db";

const csatKeys = ["1", "2", "3", "4", "5"] as const;
const cesKeys = ["1", "2", "3", "4", "5", "6", "7"] as const;
const npsKeys = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
] as const;

export async function getPublicMetrics() {
  const [snapshots, themes] = await Promise.all([
    db.csatSnapshot.findMany({
      orderBy: { period: "asc" },
      select: {
        period: true,
        avgRating: true,
        responseCount: true,
        distribution: true,
        csatFavorablePercent: true,
        cesAverage: true,
        cesFavorablePercent: true,
        cesResponseCount: true,
        cesDistribution: true,
        npsScore: true,
        npsResponseCount: true,
        npsDistribution: true,
        promoterPercent: true,
        passivePercent: true,
        detractorPercent: true,
        totalResponseCount: true,
        completeResponseCount: true,
        voiceResponseCount: true,
        invitesSentCount: true,
        inviteResponsesCount: true,
      },
    }),
    db.themeRollup.findMany({
      orderBy: [{ period: "asc" }, { mentionCount: "desc" }],
      select: {
        themeLabel: true,
        sentiment: true,
        mentionCount: true,
        publicSummary: true,
      },
    }),
  ]);

  const csatDistribution = sumDistributions(
    snapshots.map((snapshot) => snapshot.distribution),
    csatKeys
  );
  const cesDistribution = sumDistributions(
    snapshots.map((snapshot) => snapshot.cesDistribution),
    cesKeys
  );
  const npsDistribution = sumDistributions(
    snapshots.map((snapshot) => snapshot.npsDistribution),
    npsKeys
  );
  const csatCount = total(csatDistribution);
  const cesCount = total(cesDistribution);
  const npsCount = total(npsDistribution);
  const promoterCount =
    npsDistribution["9"] + npsDistribution["10"];
  const passiveCount =
    npsDistribution["7"] + npsDistribution["8"];
  const detractorCount = npsCount - promoterCount - passiveCount;

  const csat = {
    score: averageFromDistribution(csatDistribution),
    favorablePercent: percentage(
      csatDistribution["4"] + csatDistribution["5"],
      csatCount
    ),
    responseCount: csatCount,
    scale: { min: 1, max: 5 },
    distribution: csatDistribution,
  };
  const ces = {
    score: averageFromDistribution(cesDistribution),
    favorablePercent: percentage(
      cesDistribution["5"] +
        cesDistribution["6"] +
        cesDistribution["7"],
      cesCount
    ),
    responseCount: cesCount,
    scale: { min: 1, max: 7 },
    distribution: cesDistribution,
  };
  const promoterPercent = percentage(promoterCount, npsCount);
  const passivePercent = percentage(passiveCount, npsCount);
  const detractorPercent = percentage(detractorCount, npsCount);
  const nps = {
    score: npsCount
      ? round(promoterPercent - detractorPercent)
      : null,
    responseCount: npsCount,
    scale: { min: -100, max: 100, inputMin: 0, inputMax: 10 },
    promoterPercent,
    passivePercent,
    detractorPercent,
    distribution: npsDistribution,
  };

  const totalResponses = snapshots.reduce(
    (sum, snapshot) => sum + snapshot.totalResponseCount,
    0
  );
  const completeResponseCount = snapshots.reduce(
    (sum, snapshot) => sum + snapshot.completeResponseCount,
    0
  );
  const voiceResponseCount = snapshots.reduce(
    (sum, snapshot) => sum + snapshot.voiceResponseCount,
    0
  );
  const completionPercent = totalResponses
    ? Math.round((completeResponseCount / totalResponses) * 100)
    : 0;
  const voicePercent = totalResponses
    ? Math.round((voiceResponseCount / totalResponses) * 100)
    : 0;
  const surveysSent = snapshots.reduce(
    (sum, snapshot) => sum + snapshot.invitesSentCount,
    0
  );
  const inviteResponsesReceived = snapshots.reduce(
    (sum, snapshot) => sum + snapshot.inviteResponsesCount,
    0
  );
  const inviteResponseRate = surveysSent
    ? Math.round((inviteResponsesReceived / surveysSent) * 100)
    : 0;

  return {
    period: "all-time",
    latestPeriod: snapshots.at(-1)?.period ?? null,
    totalResponses,
    completeResponseCount,
    completionPercent,
    voiceResponseCount,
    voicePercent,
    surveysSent,
    inviteResponsesReceived,
    inviteResponseRate,
    csat,
    ces,
    nps,
    trend: snapshots.map((snapshot) => ({
      period: snapshot.period,
      csat: {
        score: snapshot.responseCount ? snapshot.avgRating : null,
        favorablePercent: snapshot.csatFavorablePercent,
        responseCount: snapshot.responseCount,
      },
      ces: {
        score: snapshot.cesAverage,
        favorablePercent: snapshot.cesFavorablePercent,
        responseCount: snapshot.cesResponseCount,
      },
      nps: {
        score: snapshot.npsScore,
        promoterPercent: snapshot.promoterPercent,
        passivePercent: snapshot.passivePercent,
        detractorPercent: snapshot.detractorPercent,
        responseCount: snapshot.npsResponseCount,
      },
    })),
    themes: themes.map((theme) => ({
      label: theme.themeLabel,
      sentiment: theme.sentiment,
      mentions: theme.mentionCount,
      summary: theme.publicSummary,
    })),
    overallAvg: csat.score ?? 0,
    distribution: csat.distribution,
  };
}

export const getPublicCsat = getPublicMetrics;

function sumDistributions<const T extends readonly string[]>(
  values: unknown[],
  keys: T
) {
  const distribution = Object.fromEntries(
    keys.map((key) => [key, 0])
  ) as Record<T[number], number>;

  for (const value of values) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }
    for (const key of keys) {
      const count = (value as Record<string, unknown>)[key];
      if (typeof count === "number") {
        distribution[key as T[number]] += count;
      }
    }
  }

  return distribution;
}

function averageFromDistribution(distribution: Record<string, number>) {
  let count = 0;
  let totalScore = 0;
  for (const [rating, ratingCount] of Object.entries(distribution)) {
    count += ratingCount;
    totalScore += Number(rating) * ratingCount;
  }
  return count ? round(totalScore / count) : null;
}

function total(distribution: Record<string, number>) {
  return Object.values(distribution).reduce((sum, count) => sum + count, 0);
}

function percentage(value: number, count: number) {
  return count ? round((value / count) * 100) : 0;
}

function round(value: number) {
  return Number(value.toFixed(2));
}
