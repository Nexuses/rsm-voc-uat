import { describe, expect, it } from "vitest";
import {
  buildDashboardReport,
  formatDashboardReportContext,
  formatThemeLabel,
  withinDashboardWindow,
} from "@/lib/dashboard-analytics";

const sampleItems = [
  {
    responseId: "r1",
    submittedAt: "2026-06-12T10:00:00.000Z",
    company: "Acme Holdings",
    clientName: "Jane Doe",
    source: "typed" as const,
    sentiment: "positive" as const,
    metrics: { csat: 5, ces: 6, nps: 10 },
    keyDrivers: ["Responsiveness"],
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
    keyDrivers: ["Follow-up"],
    riskSignals: ["Retention risk"],
    answers: [
      { questionNumber: 1, metric: "csat" as const, rating: 2 },
      { questionNumber: 2, metric: "ces" as const, rating: 3 },
      { questionNumber: 3, metric: "nps" as const, rating: 4 },
    ],
  },
];

describe("dashboard analytics", () => {
  it("builds CSAT, CES, and NPS aggregates", () => {
    const report = buildDashboardReport(sampleItems);

    expect(report.csat.average).toBe(3.5);
    expect(report.csat.favorablePercent).toBe(50);
    expect(report.ces.average).toBe(4.5);
    expect(report.nps.score).toBe(0);
    expect(report.voicePercent).toBe(50);
    expect(report.completionPercent).toBe(100);
    expect(report.completeCount).toBe(2);
    expect(report.riskCount).toBe(1);
    expect(report.themes).toHaveLength(2);
    expect(report.themes.map(([theme]) => theme).sort()).toEqual([
      "Follow-up",
      "Responsiveness",
    ]);
    expect(report.trend).toEqual([
      expect.objectContaining({
        period: "2026-06",
        label: "Jun 2026",
        csat: 3.5,
        ces: 4.5,
        nps: 0,
      }),
    ]);
  });

  it("formats analytics context for the chat assistant", () => {
    const report = buildDashboardReport(sampleItems);
    const context = formatDashboardReportContext(report, "all", 2);

    expect(context).toContain("DASHBOARD ANALYTICS (all time, 2 responses in scope)");
    expect(context).toContain("CSAT:");
    expect(context).toContain("Monthly trend:");
  });

  it("filters items by reporting window", () => {
    const recent = {
      ...sampleItems[0],
      submittedAt: new Date().toISOString(),
    };

    expect(withinDashboardWindow(recent.submittedAt, "90d")).toBe(true);
    expect(withinDashboardWindow("2020-01-01T00:00:00.000Z", "90d")).toBe(false);
  });

  it("capitalizes the first letter of theme labels for display", () => {
    expect(formatThemeLabel("effective WhatsApp communication")).toBe(
      "Effective WhatsApp communication"
    );
    expect(formatThemeLabel("  responsiveness")).toBe("Responsiveness");
  });
});
