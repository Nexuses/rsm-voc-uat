import { describe, expect, it } from "vitest";
import { buildDashboardReport } from "@/lib/dashboard-analytics";
import {
  buildMetricReportContent,
  extractMetricQuotes,
} from "@/lib/metric-report-content";
import { SURVEY_VERSION } from "@/lib/survey/constants";
import type { DashboardInsight } from "@/components/dashboard/types";

const sampleItems = [
  {
    responseId: "r1",
    submittedAt: "2026-06-12T10:05:00.000Z",
    company: "Example Co",
    clientName: "Noor",
    source: "typed" as const,
    sentiment: "positive" as const,
    metrics: { csat: 5, ces: 6, nps: 10 },
    keyDrivers: [],
    riskSignals: [],
    answers: [
      { questionNumber: 1, metric: "csat" as const, rating: 5 },
      { questionNumber: 2, metric: "ces" as const, rating: 6 },
      { questionNumber: 3, metric: "nps" as const, rating: 10 },
    ],
  },
];

describe("metric report content", () => {
  it("builds CSAT report content from dashboard aggregates", () => {
    const report = buildDashboardReport(sampleItems);
    const content = buildMetricReportContent("csat", report, 1);

    expect(content.scoreDisplay).toBe("100%");
    expect(content.accent).toBe("#3f9c35");
    expect(content.surveyQuestion).toContain(
      "How satisfied are you with the overall quality of services provided by RSM in Kuwait?"
    );
    expect(content.buckets).toHaveLength(4);
    expect(content.scaleCells[0].rating).toBe("5");
  });

  it("assigns CES grey and NPS blue identity accents", () => {
    const report = buildDashboardReport(sampleItems);

    expect(buildMetricReportContent("ces", report, 1).accent).toBe("#888b8d");
    expect(buildMetricReportContent("nps", report, 1).accent).toBe("#009cde");
  });

  it("extracts positive metric comments for client voices", () => {
    const insight: DashboardInsight = {
      responseId: "r1",
      conversationId: "typed_1",
      source: "typed",
      language: "en",
      submittedAt: "2026-06-12T10:05:00.000Z",
      department: null,
      partner: null,
      client: {
        name: "Noor",
        company: "Example Co",
        designation: "Director",
        tier: null,
      },
      surveyVersion: SURVEY_VERSION,
      metrics: { csat: 5, ces: 6, nps: 10 },
      avgRating: 5,
      sentiment: "positive",
      summary: null,
      keyDrivers: [],
      riskSignals: [],
      suggestedReply: {},
      nextSteps: [],
      answers: [
        {
          questionNumber: 1,
          question: "CSAT question",
          metric: "csat",
          scaleMin: 1,
          scaleMax: 5,
          rating: 5,
          comments: "Clear communication.",
          method: "typed",
        },
      ],
    };

    expect(extractMetricQuotes([insight], "csat")).toEqual([
      {
        responseId: "r1",
        text: "Clear communication.",
        company: "Example Co",
        rating: 5,
      },
    ]);
  });
});
