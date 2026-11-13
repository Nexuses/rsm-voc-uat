import { describe, expect, it } from "vitest";
import {
  attentionMetrics,
  builtInDefinitionForSurveyVersion,
  favorablePercent,
  LEGACY_V1_DEFINITION,
  npsScore,
  scoreDefinitionConfigSchema,
  scoreResponse,
  THREE_METRIC_V2_DEFINITION,
} from "@/lib/scoring";
import {
  calculateCes,
  calculateCsat,
  calculateNps,
  csatSentimentFromScore,
  needsAttentionScores,
} from "@/lib/survey/metrics";

const config = THREE_METRIC_V2_DEFINITION.config;
const csatConfig = config.metrics.csat!;
const cesConfig = config.metrics.ces!;
const npsConfig = config.metrics.nps!;

function range(min: number, max: number) {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function seededSamples(seed: number, count: number, min: number, max: number) {
  let state = seed;
  return Array.from({ length: count }, () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return min + (state % (max - min + 1));
  });
}

describe("default score definition parity with lib/survey/metrics", () => {
  it("is a valid config whose weights sum to 100", () => {
    expect(scoreDefinitionConfigSchema.safeParse(config).success).toBe(true);
    expect(
      scoreDefinitionConfigSchema.safeParse(LEGACY_V1_DEFINITION.config).success
    ).toBe(true);
  });

  it("flags needs-attention metrics identically for every score combination", () => {
    const csatValues = [null, ...range(1, 5)];
    const cesValues = [null, ...range(1, 7)];
    const npsValues = [null, ...range(0, 10)];
    for (const csatScore of csatValues) {
      for (const cesScore of cesValues) {
        for (const npsScore of npsValues) {
          const response = { csatScore, cesScore, npsScore };
          expect(attentionMetrics(scoreResponse(response, config))).toEqual(
            needsAttentionScores(response)
          );
        }
      }
    }
  });

  it("matches CSAT sentiment buckets", () => {
    const toSentiment = {
      favorable: "Satisfied",
      neutral: "Neutral",
      unfavorable: "Dissatisfied",
    } as const;
    for (const csatScore of range(1, 5)) {
      const [score] = scoreResponse(
        { csatScore, cesScore: null, npsScore: null },
        config
      );
      expect(toSentiment[score.band as keyof typeof toSentiment]).toBe(
        csatSentimentFromScore(csatScore)
      );
    }
  });

  it("reproduces CSAT/CES favorable percent and NPS on sampled populations", () => {
    for (const seed of [1, 7, 42, 99, 2026]) {
      const csat = seededSamples(seed, 137, 1, 5);
      const ces = seededSamples(seed + 1, 137, 1, 7);
      const nps = seededSamples(seed + 2, 137, 0, 10);
      expect(favorablePercent(csat, csatConfig)).toBe(
        calculateCsat(csat).favorablePercent
      );
      expect(favorablePercent(ces, cesConfig)).toBe(
        calculateCes(ces).favorablePercent
      );
      expect(npsScore(nps, npsConfig)).toBe(calculateNps(nps).score);
    }
    expect(npsScore([], npsConfig)).toBe(calculateNps([]).score);
  });

  it("puts band edges on the documented side", () => {
    const edges = scoreResponse({ csatScore: 4, cesScore: 5, npsScore: 9 }, config);
    expect(edges.map((s) => s.band)).toEqual(["favorable", "favorable", "promoter"]);
    const lows = scoreResponse({ csatScore: 2, cesScore: 3, npsScore: 6 }, config);
    expect(lows.map((s) => s.band)).toEqual(["unfavorable", "unfavorable", "detractor"]);
    const mids = scoreResponse({ csatScore: 3, cesScore: 4, npsScore: 7 }, config);
    expect(mids.map((s) => s.band)).toEqual(["neutral", "neutral", "passive"]);
  });

  it("weights a perfect response to 100", () => {
    const total = scoreResponse({ csatScore: 5, cesScore: 7, npsScore: 10 }, config)
      .reduce((sum, s) => sum + s.weightedScore, 0);
    expect(total).toBe(100);
  });

  it("keeps legacy-v1 responses CSAT-only", () => {
    const definition = builtInDefinitionForSurveyVersion("legacy-v1");
    expect(definition.key).toBe("legacy-csat");
    const scores = scoreResponse(
      { csatScore: 2, cesScore: 1, npsScore: 0 },
      definition.config
    );
    expect(scores.map((s) => s.metric)).toEqual(["csat"]);
    expect(builtInDefinitionForSurveyVersion("three-metric-v2").key).toBe(
      "three-metric"
    );
  });

  it("rejects configs whose weights do not sum to 100", () => {
    const bad = structuredClone(config);
    bad.metrics.csat!.weight = 50;
    expect(scoreDefinitionConfigSchema.safeParse(bad).success).toBe(false);
  });
});
