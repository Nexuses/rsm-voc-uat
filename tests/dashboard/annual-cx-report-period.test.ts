import { describe, expect, it } from "vitest";
import {
  buildAnnualCxPeriodReports,
  formatDeltaLabel,
  resolveAnnualCxPeriodPlan,
  resolvePeriodCxReportPlan,
  withinDateRange,
} from "@/lib/annual-cx-report-period";
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
    keyDrivers: ["Communication"],
    riskSignals: [],
    answers: [
      { questionNumber: 1, metric: "csat", rating: metrics.csat },
      { questionNumber: 2, metric: "ces", rating: metrics.ces },
      { questionNumber: 3, metric: "nps", rating: metrics.nps },
    ],
  };
}

describe("annual CX report period helpers", () => {
  it("maps windows to current and equal-length prior ranges", () => {
    const now = new Date("2026-10-19T12:00:00.000Z");
    const year = resolveAnnualCxPeriodPlan("year", now);
    expect(year.current.start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(year.filenamePeriod).toBe("year");
    expect(year.prior.end.getTime()).toBeLessThan(year.current.start.getTime());

    const ninety = resolveAnnualCxPeriodPlan("90d", now);
    expect(ninety.filenamePeriod).toBe("90d");
    const duration =
      ninety.current.end.getTime() - ninety.current.start.getTime();
    const priorDuration =
      ninety.prior.end.getTime() - ninety.prior.start.getTime();
    expect(Math.abs(duration - priorDuration)).toBeLessThan(2 * 24 * 60 * 60 * 1000);

    const all = resolveAnnualCxPeriodPlan("all", now);
    expect(all.filenamePeriod).toBe("12m");
  });

  it("uses explicit dateFrom/dateTo for custom-period CX reports", () => {
    const now = new Date("2026-10-19T12:00:00.000Z");
    const plan = resolvePeriodCxReportPlan(
      "all",
      { dateFrom: "2026-10-01", dateTo: "2026-10-31" },
      now
    );
    expect(plan.current.start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(plan.current.end.toISOString()).toBe("2026-10-31T23:59:59.999Z");
    expect(plan.filenamePeriod).toBe("2026-10-01_to_2026-10-31");
  });

  it("builds YoY comparison from current and prior responses", () => {
    const now = new Date("2026-10-19T12:00:00.000Z");
    const built = buildAnnualCxPeriodReports({
      items: [
        item("c1", "2026-06-01T10:00:00.000Z", { csat: 5, ces: 6, nps: 10 }),
        item("c2", "2026-07-01T10:00:00.000Z", { csat: 5, ces: 6, nps: 9 }),
        item("p1", "2025-06-01T10:00:00.000Z", { csat: 4, ces: 5, nps: 8 }),
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
      now,
    });

    expect(built.currentItems).toHaveLength(2);
    expect(built.priorItems).toHaveLength(1);
    expect(built.comparison.csatPercent.hasPrior).toBe(true);
    expect(built.comparison.responseCount.current).toBe(2);
    expect(built.comparison.responseCount.prior).toBe(1);
  });

  it("formats delta labels and range membership", () => {
    expect(formatDeltaLabel(1.2, "pt")).toBe("+1.2 pt");
    expect(formatDeltaLabel(-3, "%")).toBe("-3%");
    expect(formatDeltaLabel(null)).toBeNull();

    const plan = resolveAnnualCxPeriodPlan(
      "year",
      new Date("2026-10-19T12:00:00.000Z")
    );
    expect(withinDateRange("2026-05-01T00:00:00.000Z", plan.current)).toBe(true);
    expect(withinDateRange("2025-05-01T00:00:00.000Z", plan.current)).toBe(false);
  });
});
