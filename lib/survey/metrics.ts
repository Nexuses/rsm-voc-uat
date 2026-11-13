type Distribution = Record<string, number>;

function round(value: number) {
  return Number(value.toFixed(2));
}

function createDistribution(min: number, max: number): Distribution {
  return Object.fromEntries(
    Array.from({ length: max - min + 1 }, (_, index) => [
      String(min + index),
      0,
    ])
  );
}

function calculateScaledMetric(
  ratings: number[],
  min: number,
  max: number,
  favorableFrom: number
) {
  const distribution = createDistribution(min, max);
  let total = 0;
  let favorable = 0;

  for (const rating of ratings) {
    distribution[String(rating)] += 1;
    total += rating;
    if (rating >= favorableFrom) favorable += 1;
  }

  return {
    average: ratings.length ? round(total / ratings.length) : null,
    favorablePercent: ratings.length
      ? round((favorable / ratings.length) * 100)
      : 0,
    responseCount: ratings.length,
    distribution,
  };
}

export function calculateCsat(ratings: number[]) {
  return calculateScaledMetric(ratings, 1, 5, 4);
}

export function calculateCes(ratings: number[]) {
  return calculateScaledMetric(ratings, 1, 7, 5);
}

export function calculateNps(ratings: number[]) {
  const distribution = createDistribution(0, 10);
  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  for (const rating of ratings) {
    distribution[String(rating)] += 1;
    if (rating >= 9) promoters += 1;
    else if (rating >= 7) passives += 1;
    else detractors += 1;
  }

  const promoterPercent = ratings.length
    ? round((promoters / ratings.length) * 100)
    : 0;
  const passivePercent = ratings.length
    ? round((passives / ratings.length) * 100)
    : 0;
  const detractorPercent = ratings.length
    ? round((detractors / ratings.length) * 100)
    : 0;

  return {
    score: ratings.length
      ? round(promoterPercent - detractorPercent)
      : null,
    responseCount: ratings.length,
    promoterPercent,
    passivePercent,
    detractorPercent,
    distribution,
  };
}

function isVoiceResponse(conversationId: string) {
  return !conversationId.startsWith("typed_");
}

export function needsAttentionScores(response: {
  csatScore: number | null | undefined;
  cesScore: number | null | undefined;
  npsScore: number | null | undefined;
}) {
  const metrics: Array<"CSAT" | "CES" | "NPS"> = [];
  if (metricResultBand("csat", response.csatScore) === "Negative") {
    metrics.push("CSAT");
  }
  if (metricResultBand("ces", response.cesScore) === "Negative") {
    metrics.push("CES");
  }
  if (metricResultBand("nps", response.npsScore) === "Negative") {
    metrics.push("NPS");
  }
  return metrics;
}

export type OverallResult = "Positive" | "Neutral" | "Negative";

/** Combined maximum: CSAT 5 + CES 7 + NPS 10. */
export const COMBINED_SURVEY_SCORE_MAX = 22;

export type CombinedSurveyScore = {
  total: number;
  max: typeof COMBINED_SURVEY_SCORE_MAX;
  percent: number;
};

const SCORE_RANGES = {
  csatScore: { min: 1, max: 5 },
  cesScore: { min: 1, max: 7 },
  npsScore: { min: 0, max: 10 },
} as const;

type SurveyScores = {
  csatScore: number | null | undefined;
  cesScore: number | null | undefined;
  npsScore: number | null | undefined;
};

function isValidScore(
  key: keyof typeof SCORE_RANGES,
  score: number | null | undefined
): score is number {
  if (score == null || !Number.isFinite(score)) return false;
  const { min, max } = SCORE_RANGES[key];
  return score >= min && score <= max;
}

/**
 * Combined score out of 22 (CSAT + CES + NPS on their native scales).
 * Returns null unless all three metrics are present and in range, so a
 * partial response never gets a misleading percentage.
 */
export function combinedSurveyScore(input: SurveyScores): CombinedSurveyScore | null {
  if (
    !isValidScore("csatScore", input.csatScore) ||
    !isValidScore("cesScore", input.cesScore) ||
    !isValidScore("npsScore", input.npsScore)
  ) {
    return null;
  }
  const total = input.csatScore + input.cesScore + input.npsScore;
  return {
    total,
    max: COMBINED_SURVEY_SCORE_MAX,
    percent: round((total / COMBINED_SURVEY_SCORE_MAX) * 100),
  };
}

export type OverallSentiment = "positive" | "neutral" | "negative";

/**
 * Overall sentiment from the combined score out of 22:
 * below 60% Negative, 60–80% Neutral, above 80% Positive.
 * With integer totals that is ≤13 Negative, 14–17 Neutral, ≥18 Positive
 * (e.g. 18/22 = 81.8% → Positive).
 */
export function overallSentimentFromScores(
  input: SurveyScores
): OverallSentiment | null {
  const combined = combinedSurveyScore(input);
  if (!combined) return null;
  if (combined.percent < 60) return "negative";
  if (combined.percent <= 80) return "neutral";
  return "positive";
}

/**
 * Overall sentiment for display: the combined-score sentiment when all
 * three metrics are present, otherwise the stored (GPT) sentiment for
 * partial/legacy responses that cannot be combined.
 */
export function resolveOverallSentiment(input: {
  csatScore: number | null | undefined;
  cesScore: number | null | undefined;
  npsScore: number | null | undefined;
  storedSentiment?: string | null | undefined;
}): OverallSentiment | null {
  const combined = overallSentimentFromScores(input);
  if (combined) return combined;
  if (
    input.storedSentiment === "positive" ||
    input.storedSentiment === "neutral" ||
    input.storedSentiment === "negative"
  ) {
    return input.storedSentiment;
  }
  return null;
}

/**
 * One result for the completion email subject, body, and action-required send.
 * Derived from the combined score out of 22 (see
 * `overallSentimentFromScores`): below 60% Negative, 60–80% Neutral,
 * above 80% Positive. Per-metric low-score flagging stays in
 * `needsAttentionScores` / `metricResultBand`.
 */
export function metricResultBand(
  metric: "csat" | "ces" | "nps",
  score: number | null | undefined
): OverallResult | null {
  if (score == null || !Number.isFinite(score)) return null;
  if (metric === "csat") {
    if (score <= 2) return "Negative";
    if (score === 3) return "Neutral";
    if (score >= 4 && score <= 5) return "Positive";
    return null;
  }
  if (metric === "ces") {
    if (score <= 3) return "Negative";
    if (score === 4) return "Neutral";
    if (score >= 5 && score <= 7) return "Positive";
    return null;
  }
  if (score <= 6) return "Negative";
  if (score <= 8) return "Neutral";
  if (score <= 10) return "Positive";
  return null;
}

export function overallSurveyResult(input: SurveyScores): OverallResult | null {
  const sentiment = overallSentimentFromScores(input);
  if (sentiment === "positive") return "Positive";
  if (sentiment === "neutral") return "Neutral";
  if (sentiment === "negative") return "Negative";
  return null;
}

/**
 * CRM / mood vocabulary: Satisfied | Neutral | Dissatisfied.
 * Used by the completion webhook (combined score) and by CSAT-only mood
 * helpers that still filter on the CSAT scale alone.
 */
export type CsatSentiment = "Satisfied" | "Neutral" | "Dissatisfied";

/** CSAT-only buckets for dashboard mood filters (not the CRM collective label). */
export function csatSentimentFromScore(
  csatScore: number | null | undefined
): CsatSentiment | null {
  if (csatScore == null || !Number.isFinite(csatScore)) return null;
  if (csatScore >= 4 && csatScore <= 5) return "Satisfied";
  if (csatScore === 3) return "Neutral";
  if (csatScore >= 1 && csatScore <= 2) return "Dissatisfied";
  return null;
}

/**
 * Collective CRM `sentiment` from the same combined score out of 22 as
 * emails/dashboard (`overallSurveyResult`), mapped to CRM vocabulary:
 * Positive→Satisfied, Neutral→Neutral, Negative→Dissatisfied.
 */
export function crmSentimentFromScores(
  input: SurveyScores
): CsatSentiment | null {
  const result = overallSurveyResult(input);
  if (result === "Positive") return "Satisfied";
  if (result === "Neutral") return "Neutral";
  if (result === "Negative") return "Dissatisfied";
  return null;
}

export function isCompleteSurveyResponse(response: {
  csatScore: number | null | undefined;
  cesScore: number | null | undefined;
  npsScore: number | null | undefined;
}) {
  return (
    response.csatScore != null &&
    response.cesScore != null &&
    response.npsScore != null
  );
}

export function buildPeriodMetrics(
  responses: Array<{
    conversationId: string;
    csatScore: number | null;
    cesScore: number | null;
    npsScore: number | null;
  }>
) {
  return {
    totalResponseCount: responses.length,
    completeResponseCount: responses.filter(isCompleteSurveyResponse).length,
    voiceResponseCount: responses.filter((response) =>
      isVoiceResponse(response.conversationId)
    ).length,
    csat: calculateCsat(
      responses.flatMap((response) =>
        response.csatScore === null ? [] : [response.csatScore]
      )
    ),
    ces: calculateCes(
      responses.flatMap((response) =>
        response.cesScore === null ? [] : [response.cesScore]
      )
    ),
    nps: calculateNps(
      responses.flatMap((response) =>
        response.npsScore === null ? [] : [response.npsScore]
      )
    ),
  };
}
