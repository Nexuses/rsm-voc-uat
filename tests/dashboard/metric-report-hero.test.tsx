import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import MetricReportAnalytics from "@/components/dashboard/MetricReportAnalytics";
import type { DashboardInsight } from "@/components/dashboard/types";
import { buildDashboardReport } from "@/lib/dashboard-analytics";
import { buildMetricReportContent } from "@/lib/metric-report-content";
import type { MetricKind } from "@/lib/metric-report-content";

/**
 * The hero slot on a metric report page belongs to that metric's definitional
 * score. The NPS page used to fill it with promoter share while the card was
 * labelled "overall score", so a reader could take a 50% promoter share for an
 * NPS of 50 when the real score was 0. Promoter share is a different number
 * (share who scored 9–10 vs promoters minus detractors), so it now lives in the
 * caption and the donut prints the score on its −100…+100 range.
 */
function makeItems() {
  const base = {
    submittedAt: "2026-06-01T10:00:00.000Z",
    company: "Example Co",
    keyDrivers: [],
    riskSignals: [],
  };
  return [
    {
      ...base,
      responseId: "r1",
      clientName: "Noor",
      source: "voice" as const,
      sentiment: "positive" as const,
      // One promoter (10) and one detractor (4): NPS 0, promoters 50%.
      metrics: { csat: 5, ces: 6, nps: 10 },
      answers: [
        { questionNumber: 1, metric: "csat" as const, rating: 5 },
        { questionNumber: 2, metric: "ces" as const, rating: 6 },
        { questionNumber: 3, metric: "nps" as const, rating: 10 },
      ],
    },
    {
      ...base,
      responseId: "r2",
      clientName: "Fahad",
      source: "typed" as const,
      sentiment: "negative" as const,
      metrics: { csat: 2, ces: 3, nps: 4 },
      answers: [
        { questionNumber: 1, metric: "csat" as const, rating: 2 },
        { questionNumber: 2, metric: "ces" as const, rating: 3 },
        { questionNumber: 3, metric: "nps" as const, rating: 4 },
      ],
    },
  ];
}

const items = makeItems();
const report = buildDashboardReport(items as never);

function renderMetric(kind: MetricKind) {
  return render(
    <MetricReportAnalytics
      metric={kind}
      content={buildMetricReportContent(kind, report, items.length)}
      outreach={{
        surveysSent: 40,
        responsesReceived: 2,
        responseRate: 5,
        opensTracked: 12,
        startsTracked: 4,
      }}
      report={report}
      items={items as unknown as DashboardInsight[]}
    />
  );
}

describe("metric report hero", () => {
  afterEach(cleanup);

  it("shows the NPS score, not promoter share", () => {
    renderMetric("nps");

    // The score is 0 (one promoter, one detractor), while promoters are 50%.
    expect(
      within(screen.getByRole("article", { name: /\(NPS\) overall score/i }))
        .getByLabelText("NPS score 0")
    ).toBeTruthy();
    expect(screen.queryByLabelText("NPS 50%")).toBeNull();
    expect(screen.getByText("NPS score")).toBeTruthy();
    // Promoter and detractor shares stay visible, as the derivation.
    expect(screen.getByText("50% promoters − 50% detractors")).toBeTruthy();
  });

  it("keeps the CSAT percentage as its headline", () => {
    renderMetric("csat");

    // CSAT's score is the % favorable, so 50% here is the score itself.
    expect(
      within(screen.getByRole("article", { name: /\(CSAT\) overall score/i }))
        .getByLabelText("CSAT 50%")
    ).toBeTruthy();
    expect(screen.getByText("Positive responses (4 + 5) ÷ total")).toBeTruthy();
  });

  it("keeps the CES average as its headline", () => {
    renderMetric("ces");

    expect(
      within(screen.getByRole("article", { name: /\(CES\) overall score/i }))
        .getByLabelText("CES average 4.5 out of 7")
    ).toBeTruthy();
    expect(screen.getByText("4.5/7")).toBeTruthy();
  });
});
