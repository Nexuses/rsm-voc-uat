import { describe, expect, it } from "vitest";
import {
  buildPeriodMetrics,
  calculateCes,
  calculateCsat,
  calculateNps,
  combinedSurveyScore,
  crmSentimentFromScores,
  csatSentimentFromScore,
  isCompleteSurveyResponse,
  needsAttentionScores,
  overallSentimentFromScores,
  overallSurveyResult,
  resolveOverallSentiment,
} from "@/lib/survey/metrics";

describe("standard survey metrics", () => {
  it("calculates CSAT average, favorable rate, and distribution", () => {
    expect(calculateCsat([1, 4, 5])).toEqual({
      average: 3.33,
      favorablePercent: 66.67,
      responseCount: 3,
      distribution: { "1": 1, "2": 0, "3": 0, "4": 1, "5": 1 },
    });
  });

  it("calculates CES on a one-to-seven scale", () => {
    expect(calculateCes([1, 5, 7])).toEqual({
      average: 4.33,
      favorablePercent: 66.67,
      responseCount: 3,
      distribution: {
        "1": 1,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 1,
        "6": 0,
        "7": 1,
      },
    });
  });

  it("calculates canonical NPS segments and score", () => {
    expect(calculateNps([0, 6, 7, 8, 9, 10])).toEqual({
      score: 0,
      responseCount: 6,
      promoterPercent: 33.33,
      passivePercent: 33.33,
      detractorPercent: 33.33,
      distribution: {
        "0": 1,
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
        "6": 1,
        "7": 1,
        "8": 1,
        "9": 1,
        "10": 1,
      },
    });
  });

  it("treats a response as complete only when all three metrics are present", () => {
    expect(
      isCompleteSurveyResponse({ csatScore: 5, cesScore: 6, npsScore: 9 })
    ).toBe(true);
    expect(
      isCompleteSurveyResponse({ csatScore: 4, cesScore: null, npsScore: 8 })
    ).toBe(false);
  });

  it("builds one PII-free period snapshot from partial responses", () => {
    expect(
      buildPeriodMetrics([
        { conversationId: "conv_1", csatScore: 5, cesScore: 6, npsScore: 10 },
        { conversationId: "typed_2", csatScore: 3, cesScore: null, npsScore: 7 },
        { conversationId: "conv_3", csatScore: null, cesScore: 4, npsScore: null },
      ])
    ).toEqual({
      totalResponseCount: 3,
      completeResponseCount: 1,
      voiceResponseCount: 2,
      csat: {
        average: 4,
        favorablePercent: 50,
        responseCount: 2,
        distribution: { "1": 0, "2": 0, "3": 1, "4": 0, "5": 1 },
      },
      ces: {
        average: 5,
        favorablePercent: 50,
        responseCount: 2,
        distribution: {
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 1,
          "5": 0,
          "6": 1,
          "7": 0,
        },
      },
      nps: {
        score: 50,
        responseCount: 2,
        promoterPercent: 50,
        passivePercent: 50,
        detractorPercent: 0,
        distribution: {
          "0": 0,
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
          "5": 0,
          "6": 0,
          "7": 1,
          "8": 0,
          "9": 0,
          "10": 1,
        },
      },
    });
  });

  it("flags low CSAT, CES, and NPS scores for internal attention", () => {
    expect(
      needsAttentionScores({ csatScore: 5, cesScore: 6, npsScore: 9 })
    ).toEqual([]);
    expect(
      needsAttentionScores({ csatScore: 2, cesScore: 4, npsScore: 8 })
    ).toEqual(["CSAT"]);
    expect(
      needsAttentionScores({ csatScore: 3, cesScore: 3, npsScore: 6 })
    ).toEqual(["CES", "NPS"]);
  });

  it("combines CSAT + CES + NPS into a score out of 22", () => {
    expect(
      combinedSurveyScore({ csatScore: 3, cesScore: 6, npsScore: 9 })
    ).toEqual({ total: 18, max: 22, percent: 81.82 });
    expect(
      combinedSurveyScore({ csatScore: 5, cesScore: 7, npsScore: 10 })
    ).toEqual({ total: 22, max: 22, percent: 100 });
    expect(
      combinedSurveyScore({ csatScore: 5, cesScore: null, npsScore: 9 })
    ).toBeNull();
    expect(
      combinedSurveyScore({ csatScore: 6, cesScore: 6, npsScore: 9 })
    ).toBeNull();
  });

  it("bands overall sentiment by combined percentage: <60 negative, 60–80 neutral, >80 positive", () => {
    // 13/22 = 59% → negative; 14/22 = 64% and 17/22 = 77% → neutral;
    // 18/22 = 82% → positive.
    expect(
      overallSentimentFromScores({ csatScore: 3, cesScore: 4, npsScore: 6 })
    ).toBe("negative");
    expect(
      overallSentimentFromScores({ csatScore: 3, cesScore: 4, npsScore: 7 })
    ).toBe("neutral");
    expect(
      overallSentimentFromScores({ csatScore: 5, cesScore: 6, npsScore: 6 })
    ).toBe("neutral");
    expect(
      overallSentimentFromScores({ csatScore: 3, cesScore: 6, npsScore: 9 })
    ).toBe("positive");
    expect(overallSurveyResult({ csatScore: 3, cesScore: 6, npsScore: 9 })).toBe(
      "Positive"
    );
    expect(
      overallSentimentFromScores({ csatScore: null, cesScore: 6, npsScore: 9 })
    ).toBeNull();
  });

  it("resolves sentiment from scores first and falls back to the stored label only for partial responses", () => {
    expect(
      resolveOverallSentiment({
        csatScore: 3,
        cesScore: 6,
        npsScore: 9,
        storedSentiment: "neutral",
      })
    ).toBe("positive");
    expect(
      resolveOverallSentiment({
        csatScore: 3,
        cesScore: null,
        npsScore: 9,
        storedSentiment: "negative",
      })
    ).toBe("negative");
    expect(
      resolveOverallSentiment({
        csatScore: null,
        cesScore: null,
        npsScore: null,
        storedSentiment: null,
      })
    ).toBeNull();
  });

  it("maps CSAT into Satisfied / Neutral / Dissatisfied for mood filters", () => {
    expect(csatSentimentFromScore(5)).toBe("Satisfied");
    expect(csatSentimentFromScore(4)).toBe("Satisfied");
    expect(csatSentimentFromScore(3)).toBe("Neutral");
    expect(csatSentimentFromScore(2)).toBe("Dissatisfied");
    expect(csatSentimentFromScore(1)).toBe("Dissatisfied");
    expect(csatSentimentFromScore(null)).toBeNull();
    expect(csatSentimentFromScore(0)).toBeNull();
  });

  it("maps combined score into CRM Satisfied / Neutral / Dissatisfied", () => {
    // 20/22 → Satisfied; 17/22 (CSAT 4 alone would be Satisfied) → Neutral;
    // 13/22 → Dissatisfied; partial → null.
    expect(
      crmSentimentFromScores({ csatScore: 5, cesScore: 6, npsScore: 9 })
    ).toBe("Satisfied");
    expect(
      crmSentimentFromScores({ csatScore: 4, cesScore: 5, npsScore: 8 })
    ).toBe("Neutral");
    expect(
      crmSentimentFromScores({ csatScore: 3, cesScore: 4, npsScore: 6 })
    ).toBe("Dissatisfied");
    expect(
      crmSentimentFromScores({ csatScore: 5, cesScore: null, npsScore: 9 })
    ).toBeNull();
  });
});
