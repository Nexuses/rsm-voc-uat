import { describe, expect, it } from "vitest";
import type { DashboardInsight } from "@/components/dashboard/types";
import { buildSurveyChannelBreakdown } from "@/lib/survey-channel-stats";
import { SURVEY_VERSION } from "@/lib/survey/constants";

function makeInsight(
  overrides: Partial<DashboardInsight> & Pick<DashboardInsight, "responseId" | "source">
): DashboardInsight {
  return {
    conversationId: `${overrides.source}_1`,
    submittedAt: "2026-06-12T10:05:00.000Z",
    surveyVersion: SURVEY_VERSION,
    department: null,
    partner: null,
    client: null,
    metrics: { csat: 5, ces: 6, nps: 10 },
    avgRating: 5,
    sentiment: "positive",
    summary: null,
    keyDrivers: [],
    riskSignals: [],
    suggestedReply: {},
    nextSteps: [],
    language: overrides.source === "typed" ? "en" : "en",
    answers: [
      {
        questionNumber: 1,
        question: "CSAT",
        metric: "csat",
        scaleMin: 1,
        scaleMax: 5,
        rating: 5,
        comments: null,
        method: null,
      },
    ],
    ...overrides,
  };
}

describe("buildSurveyChannelBreakdown", () => {
  it("counts english, arabic, voice, and text CSAT responses", () => {
    const segments = buildSurveyChannelBreakdown(
      [
        makeInsight({ responseId: "1", source: "voice", language: "en" }),
        makeInsight({ responseId: "2", source: "voice", language: "en" }),
        makeInsight({ responseId: "3", source: "voice", language: "ar" }),
        makeInsight({ responseId: "4", source: "typed", language: "en" }),
      ],
      "csat"
    );

    expect(segments.map((segment) => [segment.id, segment.count])).toEqual([
      ["english", 2],
      ["arabic", 1],
      ["voice", 3],
      ["text", 1],
    ]);
  });

  it("filters by metric when building channel counts", () => {
    const segments = buildSurveyChannelBreakdown(
      [
        makeInsight({ responseId: "1", source: "typed", language: "en" }),
        makeInsight({
          responseId: "2",
          source: "typed",
          language: "en",
          metrics: { csat: null, ces: 6, nps: 10 },
          answers: [
            {
              questionNumber: 2,
              question: "CES",
              metric: "ces",
              scaleMin: 1,
              scaleMax: 7,
              rating: 6,
              comments: null,
              method: null,
            },
          ],
        }),
      ],
      "csat"
    );

    expect(segments.find((segment) => segment.id === "text")?.count).toBe(1);
  });
});
