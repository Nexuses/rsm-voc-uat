import { describe, expect, it } from "vitest";
import { buildDashboardReport } from "@/lib/dashboard-analytics";
import { buildMetricParticipationCards } from "@/lib/metric-participation-stats";

const sampleItems = [
  {
    responseId: "r1",
    submittedAt: "2026-06-12T10:00:00.000Z",
    company: "Acme Holdings",
    clientName: "Jane Doe",
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
  {
    responseId: "r2",
    submittedAt: "2026-06-10T10:00:00.000Z",
    company: "Beta Logistics",
    clientName: "John Smith",
    source: "voice" as const,
    sentiment: "negative" as const,
    metrics: { csat: 2, ces: 3, nps: 4 },
    keyDrivers: [],
    riskSignals: [],
    answers: [
      { questionNumber: 1, metric: "csat" as const, rating: 2 },
      { questionNumber: 2, metric: "ces" as const, rating: 3 },
      { questionNumber: 3, metric: "nps" as const, rating: 4 },
    ],
  },
];

describe("metric participation stats", () => {
  it("builds CSAT-specific participation cards", () => {
    const report = buildDashboardReport(sampleItems);
    const cards = buildMetricParticipationCards("csat", report, 2);

    expect(cards.map((card) => card.label)).toEqual([
      "CSAT ratings",
      "Rating coverage",
      "Dissatisfied",
    ]);
    expect(cards[0].value).toBe("2");
    expect(cards[1].value).toBe("100%");
    expect(cards[2].value).toBe("1");
  });

  it("builds NPS-specific participation cards without score duplication", () => {
    const report = buildDashboardReport(sampleItems);
    const cards = buildMetricParticipationCards("nps", report, 2);

    expect(cards.map((card) => card.label)).toEqual([
      "NPS ratings",
      "Rating coverage",
      "Neutral",
    ]);
    expect(cards[2].detail).toBe("Satisfied but not yet active advocates");
  });

  it("builds CES-specific participation cards", () => {
    const report = buildDashboardReport(sampleItems);
    const cards = buildMetricParticipationCards("ces", report, 2);

    expect(cards.map((card) => card.label)).toEqual([
      "CES ratings",
      "Rating coverage",
      "High effort",
    ]);
    expect(cards[2].detail).toBe("Rated 1–4 on the effort scale");
  });
});
