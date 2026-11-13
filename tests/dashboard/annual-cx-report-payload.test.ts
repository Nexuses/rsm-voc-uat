import { describe, expect, it } from "vitest";
import {
  buildAnnualCxReportDataJson,
  metricCxFilename,
  metricHasScores,
} from "@/lib/annual-cx-report-payload";
import { emptyDashboardOrgFilters } from "@/lib/dashboard-report-filters";
import type { DashboardAnalyticsItem } from "@/lib/dashboard-analytics";

function item(
  id: string,
  submittedAt: string,
  metrics: { csat: number; ces: number; nps: number }
): DashboardAnalyticsItem {
  return {
    responseId: id,
    submittedAt,
    company: "Example Co",
    clientName: "Sara",
    source: "typed",
    sentiment: "positive",
    metrics,
    keyDrivers: [],
    riskSignals: [],
    answers: [],
  };
}

describe("annual CX report payload (live scales)", () => {
  it("maps CSAT 1–5, NPS 0–10 and CES 1–7 into report_data.json", () => {
    const now = new Date("2026-10-19T12:00:00.000Z");
    const { data } = buildAnnualCxReportDataJson({
      items: [
        item("c1", "2026-06-01T10:00:00.000Z", { csat: 5, ces: 7, nps: 10 }),
        item("c2", "2026-07-01T10:00:00.000Z", { csat: 4, ces: 5, nps: 8 }),
        item("c3", "2026-08-01T10:00:00.000Z", { csat: 2, ces: 3, nps: 4 }),
        item("p1", "2025-06-01T10:00:00.000Z", { csat: 4, ces: 6, nps: 9 }),
      ],
      invites: [
        {
          sentAt: "2026-06-01T09:00:00.000Z",
          openedAt: null,
          startedAt: null,
          completedAt: "2026-06-01T10:00:00.000Z",
          department: null,
          partner: null,
        },
        {
          sentAt: "2025-06-01T09:00:00.000Z",
          openedAt: null,
          startedAt: null,
          completedAt: "2025-06-01T10:00:00.000Z",
          department: null,
          partner: null,
        },
      ],
      window: "year",
      org: emptyDashboardOrgFilters,
      quotes: [
        {
          id: "q1",
          text: "Clear advice throughout.",
          respondentName: "Sara",
          company: "Example Co",
          showAttribution: true,
          metric: "csat",
        },
      ],
      now,
    });

    expect(data.period.start_date).toBe("2026-01-01");
    expect(data.csat.very_satisfied).toBe(1);
    expect(data.csat.satisfied).toBe(1);
    expect(data.csat.dissatisfied).toBe(1);
    expect(data.nps.promoters).toBe(1);
    expect(data.nps.neutral).toBe(1);
    expect(data.nps.detractors).toBe(1);
    expect(data.ces.rating_7).toBe(1);
    expect(data.ces.rating_5).toBe(1);
    expect(data.ces.rating_3).toBe(1);
    expect(data.ces.target).toBe(5);
    expect(data.testimonials).toEqual([
      {
        quote: "Clear advice throughout.",
        name: "Sara",
        company: "Example Co",
      },
    ]);
    expect(data.responses.received).toBe(3);
    expect(data.responses.prev_received).toBe(1);
  });

  it("maps AI narrative into text_overrides", () => {
    const { data } = buildAnnualCxReportDataJson({
      items: [],
      invites: [],
      window: "year",
      org: emptyDashboardOrgFilters,
      quotes: [],
      narrative: {
        executiveSummary: "Steady progress across measures.",
        csatNarrative: "CSAT held up.",
        cesNarrative: "CES remained favourable.",
        npsNarrative: "NPS reflected advocacy.",
        voiceOfClientThemes: "Communication.",
        outlook: "We aim to sustain service quality.",
      },
      now: new Date("2026-10-19T12:00:00.000Z"),
    });

    expect(data.text_overrides.p7_intro).toContain("Steady progress");
    expect(data.text_overrides.csat_para).toContain("CSAT");
    expect(data.text_overrides.conclusion).toContain("aim to sustain");
  });

  it("exposes metric filename and score presence helpers", () => {
    const now = new Date("2026-10-19T12:00:00.000Z");
    const { plan, data } = buildAnnualCxReportDataJson({
      items: [
        item("c1", "2026-06-01T10:00:00.000Z", { csat: 5, ces: 7, nps: 10 }),
      ],
      invites: [],
      window: "year",
      org: emptyDashboardOrgFilters,
      quotes: [],
      now,
    });
    expect(metricHasScores(data, "csat")).toBe(true);
    expect(metricHasScores(data, "nps")).toBe(true);
    expect(metricHasScores(data, "ces")).toBe(true);
    expect(metricCxFilename("nps", plan, now)).toBe(
      "rsm-nps-report-year-2026-10-19.pdf"
    );
  });
});
