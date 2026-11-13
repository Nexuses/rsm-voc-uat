import type { DashboardReport } from "@/lib/dashboard-analytics";
import type { MetricKind } from "@/lib/metric-report-content";

export type MetricParticipationCard = {
  label: string;
  value: string;
  detail: string;
  icon: "responses" | "metric" | "chart" | "insight";
  highlight: boolean;
};

function coveragePercent(metricCount: number, responseCount: number) {
  return responseCount ? Math.round((metricCount / responseCount) * 100) : 0;
}

function csatDissatisfiedCount(distribution: number[]) {
  return (distribution[0] ?? 0) + (distribution[1] ?? 0);
}

function cesHighEffortCount(distribution: number[]) {
  return (
    (distribution[0] ?? 0) +
    (distribution[1] ?? 0) +
    (distribution[2] ?? 0) +
    (distribution[3] ?? 0)
  );
}

export function buildMetricParticipationCards(
  metric: MetricKind,
  report: DashboardReport,
  responseCount: number
): MetricParticipationCard[] {
  const totalDetail = `of ${responseCount} total responses in period`;

  if (metric === "csat") {
    const dissatisfiedCount = csatDissatisfiedCount(report.csat.distribution);
    const coverage = coveragePercent(report.csat.count, responseCount);

    return [
      {
        label: "CSAT ratings",
        value: String(report.csat.count),
        detail: totalDetail,
        icon: "responses",
        highlight: false,
      },
      {
        label: "Rating coverage",
        value: `${coverage}%`,
        detail: "Share of period responses with a CSAT score",
        icon: "chart",
        highlight: true,
      },
      {
        label: "Dissatisfied",
        value: String(dissatisfiedCount),
        detail: "Rated 1 or 2 on the satisfaction scale",
        icon: "insight",
        highlight: false,
      },
    ];
  }

  if (metric === "nps") {
    const { nps } = report;
    const coverage = coveragePercent(nps.count, responseCount);

    return [
      {
        label: "NPS ratings",
        value: String(nps.count),
        detail: totalDetail,
        icon: "responses",
        highlight: false,
      },
      {
        label: "Rating coverage",
        value: `${coverage}%`,
        detail: "Share of period responses with an NPS score",
        icon: "chart",
        highlight: true,
      },
      {
        label: "Neutral",
        value: String(nps.passives),
        detail: "Satisfied but not yet active advocates",
        icon: "insight",
        highlight: false,
      },
    ];
  }

  const highEffortCount = cesHighEffortCount(report.ces.distribution);
  const coverage = coveragePercent(report.ces.count, responseCount);

  return [
    {
      label: "CES ratings",
      value: String(report.ces.count),
      detail: totalDetail,
      icon: "responses",
      highlight: false,
    },
    {
      label: "Rating coverage",
      value: `${coverage}%`,
      detail: "Share of period responses with a CES score",
      icon: "chart",
      highlight: true,
    },
    {
      label: "High effort",
      value: String(highEffortCount),
      detail: "Rated 1–4 on the effort scale",
      icon: "insight",
      highlight: false,
    },
  ];
}
