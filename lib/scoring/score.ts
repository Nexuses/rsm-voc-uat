import type {
  NpsMetricConfig,
  ScaledMetricConfig,
  ScoreDefinitionConfig,
  ScoreMetric,
} from "@/lib/scoring/definitions";

export type ScoreBand =
  | "favorable"
  | "neutral"
  | "unfavorable"
  | "promoter"
  | "passive"
  | "detractor";

export type MetricScore = {
  metric: ScoreMetric;
  value: number;
  band: ScoreBand;
  needsAttention: boolean;
  weightedScore: number;
};

export type ScorableResponse = {
  csatScore: number | null | undefined;
  cesScore: number | null | undefined;
  npsScore: number | null | undefined;
};

function normalized(value: number, min: number, max: number) {
  const clamped = Math.min(max, Math.max(min, value));
  return (clamped - min) / (max - min);
}

function round(value: number) {
  return Number(value.toFixed(2));
}

export function bandForScaled(value: number, config: ScaledMetricConfig): ScoreBand {
  if (value >= config.favorableFrom) return "favorable";
  if (value <= config.attentionAtOrBelow) return "unfavorable";
  return "neutral";
}

export function bandForNps(value: number, config: NpsMetricConfig): ScoreBand {
  if (value >= config.promoterFrom) return "promoter";
  if (value >= config.passiveFrom) return "passive";
  return "detractor";
}

function valueFor(response: ScorableResponse, metric: ScoreMetric) {
  const value =
    metric === "csat"
      ? response.csatScore
      : metric === "ces"
        ? response.cesScore
        : response.npsScore;
  return value != null && Number.isFinite(value) ? value : null;
}

export function scoreResponse(
  response: ScorableResponse,
  config: ScoreDefinitionConfig
): MetricScore[] {
  const scores: MetricScore[] = [];
  for (const metric of ["csat", "ces", "nps"] as const) {
    const metricConfig = config.metrics[metric];
    const value = valueFor(response, metric);
    if (!metricConfig || value == null) continue;

    const band =
      metricConfig.kind === "nps"
        ? bandForNps(value, metricConfig)
        : bandForScaled(value, metricConfig);
    scores.push({
      metric,
      value,
      band,
      needsAttention: value <= metricConfig.attentionAtOrBelow,
      weightedScore: round(
        normalized(value, metricConfig.min, metricConfig.max) *
          metricConfig.weight
      ),
    });
  }
  return scores;
}

export function attentionMetrics(scores: MetricScore[]) {
  return scores
    .filter((score) => score.needsAttention)
    .map((score) => score.metric.toUpperCase() as "CSAT" | "CES" | "NPS");
}

export function favorablePercent(values: number[], config: ScaledMetricConfig) {
  if (!values.length) return 0;
  const favorable = values.filter(
    (value) => bandForScaled(value, config) === "favorable"
  ).length;
  return round((favorable / values.length) * 100);
}

export function npsScore(values: number[], config: NpsMetricConfig) {
  if (!values.length) return null;
  let promoters = 0;
  let detractors = 0;
  for (const value of values) {
    const band = bandForNps(value, config);
    if (band === "promoter") promoters += 1;
    if (band === "detractor") detractors += 1;
  }
  return round(
    round((promoters / values.length) * 100) -
      round((detractors / values.length) * 100)
  );
}
