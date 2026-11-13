import { formatPeriodLabel } from "@/lib/period-label";

export type DashboardWindow = "all" | "90d" | "year";

export type DashboardAnalyticsItem = {
  responseId: string;
  submittedAt: string;
  company: string | null;
  clientName: string | null;
  source: "voice" | "typed";
  sentiment: "positive" | "neutral" | "negative" | null;
  metrics: {
    csat: number | null;
    ces: number | null;
    nps: number | null;
  };
  keyDrivers: string[];
  riskSignals: string[];
  answers: Array<{
    questionNumber: number;
    metric: "csat" | "ces" | "nps" | null;
    rating: number;
  }>;
};

export type DashboardReport = ReturnType<typeof buildDashboardReport>;

export function withinDashboardWindow(
  submittedAt: string,
  window: DashboardWindow
) {
  if (window === "all") return true;
  const date = new Date(submittedAt);
  const now = new Date();
  if (window === "year") return date.getUTCFullYear() === now.getUTCFullYear();
  return date.getTime() >= now.getTime() - 90 * 24 * 60 * 60 * 1000;
}

function isCompleteResponse(item: DashboardAnalyticsItem) {
  return (
    readMetricValue(item, "csat") !== null &&
    readMetricValue(item, "ces") !== null &&
    readMetricValue(item, "nps") !== null
  );
}

export function buildDashboardReport(items: DashboardAnalyticsItem[]) {
  const csatValues = metricValues(items, "csat");
  const cesValues = metricValues(items, "ces");
  const npsValues = metricValues(items, "nps");
  const promoters = npsValues.filter((value) => value >= 9).length;
  const passives = npsValues.filter((value) => value >= 7 && value <= 8).length;
  const detractors = npsValues.filter((value) => value <= 6).length;
  const promoterPercent = percent(promoters, npsValues.length);
  const passivePercent = percent(passives, npsValues.length);
  const detractorPercent = percent(detractors, npsValues.length);
  const sentiments = {
    positive: items.filter((item) => item.sentiment === "positive").length,
    neutral: items.filter((item) => item.sentiment === "neutral").length,
    negative: items.filter((item) => item.sentiment === "negative").length,
  };
  const enrichedCount =
    sentiments.positive + sentiments.neutral + sentiments.negative;
  const themes = new Map<string, number>();
  for (const item of items) {
    for (const driver of item.keyDrivers) {
      const normalized = driver.trim();
      if (normalized) themes.set(normalized, (themes.get(normalized) ?? 0) + 1);
    }
  }

  const voiceCount = items.filter((item) => item.source === "voice").length;
  const completeCount = items.filter(isCompleteResponse).length;

  return {
    csat: {
      average: average(csatValues),
      favorablePercent: percent(
        csatValues.filter((value) => value >= 4).length,
        csatValues.length
      ),
      count: csatValues.length,
      distribution: distribution(csatValues, 1, 5),
    },
    ces: {
      average: average(cesValues),
      favorablePercent: percent(
        cesValues.filter((value) => value >= 5).length,
        cesValues.length
      ),
      count: cesValues.length,
      distribution: distribution(cesValues, 1, 7),
    },
    nps: {
      score: npsValues.length ? promoterPercent - detractorPercent : null,
      promoterPercent,
      passivePercent,
      detractorPercent,
      promoters,
      passives,
      detractors,
      count: npsValues.length,
      distribution: distribution(npsValues, 0, 10),
    },
    voicePercent: percent(voiceCount, items.length),
    voiceCount,
    completionPercent: percent(completeCount, items.length),
    completeCount,
    riskCount: items.filter((item) => item.riskSignals.length > 0).length,
    positivePercent: percent(sentiments.positive, enrichedCount),
    neutralPercent: percent(sentiments.neutral, enrichedCount),
    negativePercent: percent(sentiments.negative, enrichedCount),
    themes: [...themes.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8),
    trend: monthlyTrend(items),
  };
}

export function formatThemeLabel(theme: string) {
  const trimmed = theme.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleUpperCase("en") + trimmed.slice(1);
}

export function formatDashboardReportContext(
  report: DashboardReport,
  window: DashboardWindow,
  responseCount: number
) {
  const windowLabel =
    window === "all"
      ? "all time"
      : window === "90d"
        ? "last 90 days"
        : "this year";

  const lines = [
    `DASHBOARD ANALYTICS (${windowLabel}, ${responseCount} responses in scope):`,
    `CSAT: ${formatAverage(report.csat.average, 5)} average, ${report.csat.favorablePercent}% favorable (${report.csat.count} ratings), distribution ${formatDistribution(report.csat.distribution, 1)}`,
    `CES: ${formatAverage(report.ces.average, 7)} average, ${report.ces.favorablePercent}% favorable (${report.ces.count} ratings), distribution ${formatDistribution(report.ces.distribution, 1)}`,
    `NPS: ${report.nps.score ?? "n/a"} score, promoters ${report.nps.promoterPercent}%, neutral ${report.nps.passivePercent}%, detractors ${report.nps.detractorPercent}% (${report.nps.count} ratings)`,
    `Sentiment mix: ${report.positivePercent}% positive, ${report.neutralPercent}% neutral, ${report.negativePercent}% negative`,
    `Responses with risk signals: ${report.riskCount}`,
    `Voice survey share: ${report.voicePercent}%`,
    `Survey completion rate: ${report.completionPercent}% (${report.completeCount} of ${responseCount} with CSAT, CES, and NPS)`,
  ];

  if (report.themes.length) {
    lines.push(
      `Leading themes: ${report.themes
        .map(([theme, count]) => `${theme} (${count})`)
        .join(", ")}`
    );
  }

  if (report.trend.length) {
    lines.push("Monthly trend:");
    for (const row of report.trend) {
      lines.push(
        `- ${row.label}: CSAT ${formatAverage(row.csat, 5)}, CES ${formatAverage(row.ces, 7)}, NPS ${row.nps ?? "n/a"}`
      );
    }
  }

  return lines.join("\n");
}

function metricValues(
  items: DashboardAnalyticsItem[],
  metric: "csat" | "ces" | "nps"
) {
  return items.flatMap((item) => {
    const value = readMetricValue(item, metric);
    return value === null ? [] : [value];
  });
}

function readMetricValue(
  item: DashboardAnalyticsItem,
  metric: "csat" | "ces" | "nps"
) {
  const direct = item.metrics[metric];
  if (typeof direct === "number") return direct;
  const answer = item.answers.find(
    (candidate) =>
      candidate.metric === metric ||
      candidate.questionNumber ===
        ({ csat: 1, ces: 2, nps: 3 } as const)[metric]
  );
  return answer?.rating ?? null;
}

function monthlyTrend(items: DashboardAnalyticsItem[]) {
  const groups = new Map<string, DashboardAnalyticsItem[]>();
  for (const item of items) {
    const date = new Date(item.submittedAt);
    const period = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const group = groups.get(period) ?? [];
    group.push(item);
    groups.set(period, group);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, group]) => ({
      period,
      label: formatPeriodLabel(period),
      csat: average(metricValues(group, "csat")),
      ces: average(metricValues(group, "ces")),
      nps: (() => {
        const npsValues = metricValues(group, "nps");
        if (!npsValues.length) return null;
        return (
          percent(npsValues.filter((value) => value >= 9).length, npsValues.length) -
          percent(npsValues.filter((value) => value <= 6).length, npsValues.length)
        );
      })(),
    }));
}

function average(numbers: number[]) {
  return numbers.length
    ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length
    : null;
}

function distribution(numbers: number[], min: number, max: number) {
  const result = Array.from({ length: max - min + 1 }, () => 0);
  for (const number of numbers) {
    if (number >= min && number <= max) result[number - min] += 1;
  }
  return result;
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function formatAverage(value: number | null, max: number) {
  return value === null ? "n/a" : `${value.toFixed(1)}/${max}`;
}

function formatDistribution(values: number[], min: number) {
  return values
    .map((count, index) => `${index + min}:${count}`)
    .join(", ");
}
