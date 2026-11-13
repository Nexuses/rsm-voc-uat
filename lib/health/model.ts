import { z } from "zod";
import { THREE_METRIC_V2_DEFINITION } from "@/lib/scoring/definitions";

export const HEALTH_STATES = ["healthy", "watch", "at_risk", "unknown"] as const;
export type HealthState = (typeof HEALTH_STATES)[number];

export const healthModelConfigSchema = z
  .object({
    lookbackDays: z.number().int().min(30).max(730),
    minResponses: z.number().int().min(1).max(50),
    weights: z.object({
      csat: z.number().min(0),
      ces: z.number().min(0),
      nps: z.number().min(0),
      cases: z.number().min(0),
    }),
    /** Points (0–100) the case component loses per open case. */
    openCasePenalty: z.number().min(0).max(100),
    thresholds: z.object({ healthy: z.number().min(0).max(100), watch: z.number().min(0).max(100) }),
  })
  .refine((c) => c.thresholds.healthy > c.thresholds.watch, "healthy must sit above watch")
  .refine(
    (c) => c.weights.csat + c.weights.ces + c.weights.nps + c.weights.cases > 0,
    "at least one weight must be positive"
  );

export type HealthModelConfig = z.infer<typeof healthModelConfigSchema>;

// Placeholder weights and thresholds pending RSM sign-off; stored per version
// in HealthModel so a change never rewrites past snapshots.
export const DEFAULT_HEALTH_MODEL = {
  key: "default",
  version: 1,
  config: {
    lookbackDays: 365,
    minResponses: 1,
    weights: { csat: 30, ces: 20, nps: 30, cases: 20 },
    openCasePenalty: 25,
    thresholds: { healthy: 70, watch: 50 },
  } satisfies HealthModelConfig,
};

export type HealthResponseInput = {
  csat: number | null;
  ces: number | null;
  nps: number | null;
  /** ContactRole.stakeholderWeight; defaults to 1. */
  weight?: number | null;
};

type Component = { value: number | null; weight: number; basis: number };

function weightedShare(
  responses: HealthResponseInput[],
  pick: (r: HealthResponseInput) => number | null,
  isPositive: (value: number) => number
): { value: number | null; basis: number } {
  let total = 0;
  let positive = 0;
  let basis = 0;
  for (const response of responses) {
    const value = pick(response);
    if (value === null || value === undefined) continue;
    const weight = Math.max(response.weight ?? 1, 0);
    total += weight;
    positive += weight * isPositive(value);
    basis += 1;
  }
  return { value: total > 0 ? (positive / total) * 100 : null, basis };
}

/**
 * Pure account health. CSAT/CES use the favorable share; NPS maps −100..100
 * to 0..100; the case component starts at 100 and loses points per open case.
 */
export function computeAccountHealth(input: {
  responses: HealthResponseInput[];
  openCases: number;
  config: HealthModelConfig;
}) {
  const metrics = THREE_METRIC_V2_DEFINITION.config.metrics;
  const csat = weightedShare(input.responses, (r) => r.csat, (v) =>
    v >= (metrics.csat?.favorableFrom ?? 4) ? 1 : 0
  );
  const ces = weightedShare(input.responses, (r) => r.ces, (v) =>
    v >= (metrics.ces?.favorableFrom ?? 5) ? 1 : 0
  );
  const npsPromoter = metrics.nps?.promoterFrom ?? 9;
  const npsPassive = metrics.nps?.passiveFrom ?? 7;
  const nps = weightedShare(input.responses, (r) => r.nps, (v) =>
    v >= npsPromoter ? 1 : v >= npsPassive ? 0.5 : 0
  );

  const components: Record<string, Component> = {
    csat: { value: csat.value, weight: input.config.weights.csat, basis: csat.basis },
    ces: { value: ces.value, weight: input.config.weights.ces, basis: ces.basis },
    nps: { value: nps.value, weight: input.config.weights.nps, basis: nps.basis },
    cases: {
      value: Math.max(0, 100 - input.openCases * input.config.openCasePenalty),
      weight: input.config.weights.cases,
      basis: input.openCases,
    },
  };

  const surveyed = Math.max(csat.basis, ces.basis, nps.basis);
  if (surveyed < input.config.minResponses) {
    return { score: null, state: "unknown" as HealthState, components, surveyed };
  }

  let weightTotal = 0;
  let sum = 0;
  for (const component of Object.values(components)) {
    if (component.value === null || component.weight <= 0) continue;
    weightTotal += component.weight;
    sum += component.value * component.weight;
  }
  const score = weightTotal > 0 ? Math.round((sum / weightTotal) * 10) / 10 : null;
  const state: HealthState =
    score === null
      ? "unknown"
      : score >= input.config.thresholds.healthy
        ? "healthy"
        : score >= input.config.thresholds.watch
          ? "watch"
          : "at_risk";
  return { score, state, components, surveyed };
}
