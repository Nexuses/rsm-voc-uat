import { z } from "zod";

export const SCORE_METRICS = ["csat", "ces", "nps"] as const;
export type ScoreMetric = (typeof SCORE_METRICS)[number];

const scaledMetricSchema = z
  .object({
    kind: z.literal("scaled"),
    min: z.number().int(),
    max: z.number().int(),
    favorableFrom: z.number(),
    attentionAtOrBelow: z.number(),
    weight: z.number().min(0).max(100),
  })
  .refine((m) => m.min < m.max, "min must be below max")
  .refine(
    (m) => m.attentionAtOrBelow < m.favorableFrom,
    "attention threshold must sit below the favorable band"
  );

const npsMetricSchema = z
  .object({
    kind: z.literal("nps"),
    min: z.number().int(),
    max: z.number().int(),
    promoterFrom: z.number(),
    passiveFrom: z.number(),
    attentionAtOrBelow: z.number(),
    weight: z.number().min(0).max(100),
  })
  .refine((m) => m.passiveFrom < m.promoterFrom, "passive must sit below promoter");

export const scoreDefinitionConfigSchema = z
  .object({
    metrics: z
      .object({
        csat: scaledMetricSchema.optional(),
        ces: scaledMetricSchema.optional(),
        nps: npsMetricSchema.optional(),
      })
      .refine((m) => Object.keys(m).length > 0, "at least one metric required"),
  })
  .refine(
    (config) =>
      Math.abs(
        Object.values(config.metrics).reduce(
          (sum, metric) => sum + (metric?.weight ?? 0),
          0
        ) - 100
      ) < 1e-9,
    "metric weights must sum to 100"
  );

export type ScoreDefinitionConfig = z.infer<typeof scoreDefinitionConfigSchema>;
export type ScaledMetricConfig = z.infer<typeof scaledMetricSchema>;
export type NpsMetricConfig = z.infer<typeof npsMetricSchema>;

export type BuiltInScoreDefinition = {
  key: string;
  version: number;
  surveyVersion: string;
  config: ScoreDefinitionConfig;
};

// Mirrors lib/survey/metrics.ts exactly; tests/scoring enforces parity.
export const THREE_METRIC_V2_DEFINITION: BuiltInScoreDefinition = {
  key: "three-metric",
  version: 1,
  surveyVersion: "three-metric-v2",
  config: {
    metrics: {
      csat: {
        kind: "scaled",
        min: 1,
        max: 5,
        favorableFrom: 4,
        attentionAtOrBelow: 2,
        weight: 34,
      },
      ces: {
        kind: "scaled",
        min: 1,
        max: 7,
        favorableFrom: 5,
        attentionAtOrBelow: 3,
        weight: 33,
      },
      nps: {
        kind: "nps",
        min: 0,
        max: 10,
        promoterFrom: 9,
        passiveFrom: 7,
        attentionAtOrBelow: 6,
        weight: 33,
      },
    },
  },
};

// Pre-v2 responses only carried a CSAT rating.
export const LEGACY_V1_DEFINITION: BuiltInScoreDefinition = {
  key: "legacy-csat",
  version: 1,
  surveyVersion: "legacy-v1",
  config: {
    metrics: {
      csat: {
        kind: "scaled",
        min: 1,
        max: 5,
        favorableFrom: 4,
        attentionAtOrBelow: 2,
        weight: 100,
      },
    },
  },
};

export const BUILT_IN_SCORE_DEFINITIONS = [
  THREE_METRIC_V2_DEFINITION,
  LEGACY_V1_DEFINITION,
];

export function builtInDefinitionForSurveyVersion(
  surveyVersion: string | null | undefined
): BuiltInScoreDefinition {
  return (
    BUILT_IN_SCORE_DEFINITIONS.find(
      (definition) => definition.surveyVersion === surveyVersion
    ) ?? THREE_METRIC_V2_DEFINITION
  );
}
