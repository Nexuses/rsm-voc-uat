import { describe, expect, it } from "vitest";
import { parseChatCharts, parseChatModelOutput, buildAnalyticsChartsForQuestion } from "@/lib/chat-charts";

describe("chat charts", () => {
  it("parses a structured model response with charts", () => {
    const result = parseChatModelOutput(
      JSON.stringify({
        answer: "NPS improved over the last three months.",
        charts: [
          {
            type: "line",
            title: "Monthly NPS",
            labels: ["Apr", "May", "Jun"],
            series: [{ name: "NPS", values: [12, 18, 24] }],
          },
          {
            type: "donut",
            title: "Sentiment mix",
            segments: [
              { label: "Positive", value: 6 },
              { label: "Neutral", value: 2 },
              { label: "Negative", value: 1 },
            ],
          },
        ],
      })
    );

    expect(result.answer).toContain("NPS improved");
    expect(result.charts).toHaveLength(2);
    expect(result.charts[0]?.type).toBe("line");
    expect(result.charts[1]?.type).toBe("donut");
  });

  it("falls back to plain text when JSON is invalid", () => {
    const result = parseChatModelOutput("Here is a direct answer.");
    expect(result.answer).toBe("Here is a direct answer.");
    expect(result.charts).toEqual([]);
  });

  it("drops invalid chart payloads", () => {
    const charts = parseChatCharts([
      {
        type: "bar",
        title: "Themes",
        labels: ["Responsiveness", "Quality"],
        values: [4, 2],
      },
      {
        type: "bar",
        title: "Broken",
        labels: ["A"],
        values: [1, 2],
      },
    ]);

    expect(charts).toHaveLength(1);
    expect(charts[0]?.title).toBe("Themes");
  });

  it("extracts prose when only the chart spec is too strict for zod", () => {
    const result = parseChatModelOutput(
      JSON.stringify({
        answer:
          "For June 2026, CSAT average is 3.7 out of 5, CES is 5.3 out of 7, and NPS is 38.",
        charts: [
          {
            type: "line",
            title: "June 2026 CSAT / CES / NPS Trends",
            labels: ["Jun 2026"],
            series: [
              { name: "CSAT", values: [3.7] },
              { name: "CES", values: [5.3] },
              { name: "NPS", values: [38] },
            ],
          },
        ],
      })
    );

    expect(result.answer).toContain("June 2026");
    expect(result.answer).not.toContain('"charts"');
    expect(result.charts).toHaveLength(1);
    expect(result.charts[0]?.type).toBe("bar");
    expect(result.charts[0]?.title).toBe("June 2026 CSAT / CES / NPS Trends");
  });

  it("builds a theme bar chart for theme-frequency questions", () => {
    const charts = buildAnalyticsChartsForQuestion(
      "What themes are showing up most often?",
      {
        csat: {
          average: 3.7,
          favorablePercent: 50,
          count: 10,
          distribution: [0, 0, 0, 0, 0],
        },
        ces: {
          average: 5.3,
          favorablePercent: 60,
          count: 10,
          distribution: [0, 0, 0, 0, 0, 0, 0],
        },
        nps: {
          score: 38,
          promoterPercent: 50,
          passivePercent: 30,
          detractorPercent: 20,
          promoters: 5,
          passives: 3,
          detractors: 2,
          count: 10,
          distribution: Array.from({ length: 11 }, () => 0),
        },
        voicePercent: 40,
        voiceCount: 4,
        completionPercent: 90,
        completeCount: 9,
        riskCount: 2,
        positivePercent: 50,
        neutralPercent: 30,
        negativePercent: 20,
        themes: [
          ["WhatsApp communication", 4],
          ["Service quality", 3],
          ["Responsiveness", 2],
        ],
        trend: [],
      }
    );

    expect(charts).toHaveLength(1);
    expect(charts[0]?.type).toBe("bar");
    expect(charts[0]?.title).toBe("Leading themes");
    if (charts[0]?.type === "bar") {
      expect(charts[0].labels[0]).toContain("WhatsApp");
      expect(charts[0].values[0]).toBe(4);
    }
  });
});
