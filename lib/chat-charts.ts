import { z } from "zod";
import {
  formatThemeLabel,
  type DashboardReport,
} from "@/lib/dashboard-analytics";

export const CHAT_CHART_COLORS = [
  "#00153d",
  "#009cde",
  "#3f9c35",
  "#63666a",
  "#7a5cff",
  "#d97706",
] as const;

const lineChartSchema = z
  .object({
    type: z.literal("line"),
    title: z.string().trim().min(1).max(80),
    subtitle: z.string().trim().max(120).optional(),
    labels: z.array(z.string().trim().min(1).max(32)).min(1).max(24),
    series: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(32),
          values: z.array(z.number()),
        })
      )
      .min(1)
      .max(3),
  })
  .refine(
    (chart) =>
      chart.series.every((series) => series.values.length === chart.labels.length),
    { message: "Line series values must match label count" }
  );

const barChartSchema = z
  .object({
    type: z.literal("bar"),
    title: z.string().trim().min(1).max(80),
    subtitle: z.string().trim().max(120).optional(),
    labels: z.array(z.string().trim().min(1).max(32)).min(1).max(16),
    values: z.array(z.number().nonnegative()),
    valueLabel: z.string().trim().max(24).optional(),
  })
  .refine((chart) => chart.labels.length === chart.values.length, {
    message: "Bar values must match label count",
  });

const donutChartSchema = z.object({
  type: z.literal("donut"),
  title: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().max(120).optional(),
  segments: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(32),
        value: z.number().nonnegative(),
      })
    )
    .min(2)
    .max(8),
});

const chatChartSchema = z.discriminatedUnion("type", [
  lineChartSchema,
  barChartSchema,
  donutChartSchema,
]);

export type ChatLineChart = z.infer<typeof lineChartSchema>;
export type ChatBarChart = z.infer<typeof barChartSchema>;
export type ChatDonutChart = z.infer<typeof donutChartSchema>;
export type ChatChart = z.infer<typeof chatChartSchema>;

const chatResponseSchema = z.object({
  answer: z.string().trim().min(1).max(8_000),
  charts: z.array(chatChartSchema).max(3).optional().default([]),
});

function normalizeChart(chart: ChatChart): ChatChart {
  if (chart.type === "line" && chart.labels.length === 1) {
    return {
      type: "bar",
      title: chart.title,
      subtitle: chart.subtitle ?? chart.labels[0],
      labels: chart.series.map((series) => series.name),
      values: chart.series.map((series) => series.values[0] ?? 0),
    };
  }
  return chart;
}

export function extractJsonPayload(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) return raw.slice(start, end + 1);

  return raw;
}

export function parseChatCharts(value: unknown): ChatChart[] {
  if (!Array.isArray(value)) return [];
  const charts: ChatChart[] = [];
  for (const entry of value.slice(0, 3)) {
    const parsed = chatChartSchema.safeParse(entry);
    if (parsed.success) charts.push(normalizeChart(parsed.data));
  }
  return charts;
}

export function parseChatModelOutput(raw: string): {
  answer: string;
  charts: ChatChart[];
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      answer: "The available feedback did not produce an answer.",
      charts: [],
    };
  }

  const jsonPayload = extractJsonPayload(trimmed);
  let payload: unknown;
  try {
    payload = JSON.parse(jsonPayload);
  } catch {
    return { answer: trimmed, charts: [] };
  }

  if (payload && typeof payload === "object" && "answer" in payload) {
    const record = payload as Record<string, unknown>;
    const answer =
      typeof record.answer === "string" && record.answer.trim()
        ? record.answer.trim()
        : null;

    if (answer) {
      const strict = chatResponseSchema.safeParse(payload);
      if (strict.success) {
        return {
          answer: strict.data.answer,
          charts: strict.data.charts.map(normalizeChart),
        };
      }

      return {
        answer,
        charts: parseChatCharts(record.charts),
      };
    }
  }

  const parsed = chatResponseSchema.safeParse(payload);
  if (parsed.success) {
    return {
      answer: parsed.data.answer,
      charts: parsed.data.charts.map(normalizeChart),
    };
  }

  return { answer: trimmed, charts: [] };
}

const THEME_QUESTION =
  /\b(theme|driver|topics?|showing up|mentioned|most often|frequent|language)\b/i;
const TREND_QUESTION =
  /\b(trend|month over month|monthly|over time|changed|movement)\b/i;
const METRICS_QUESTION =
  /\b(summarize|summary|csat|ces|nps|metric|score|performance|overview)\b/i;
const SENTIMENT_QUESTION = /\b(sentiment|positive|negative|neutral)\b/i;

function truncateChartLabel(label: string, max = 36) {
  const trimmed = label.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

function buildThemeBarChart(report: DashboardReport): ChatBarChart {
  const topThemes = report.themes.slice(0, 8);
  return {
    type: "bar",
    title: "Leading themes",
    subtitle: "Mentions in enriched responses",
    labels: topThemes.map(([theme]) => truncateChartLabel(formatThemeLabel(theme))),
    values: topThemes.map(([, count]) => count),
    valueLabel: "Mentions",
  };
}

function buildTrendChart(report: DashboardReport): ChatLineChart | ChatBarChart | null {
  if (report.trend.length >= 2) {
    return {
      type: "line",
      title: "Experience trend",
      subtitle: "Monthly CSAT, CES, and NPS",
      labels: report.trend.map((row) => row.label),
      series: [
        {
          name: "CSAT",
          values: report.trend.map((row) => row.csat ?? 0),
        },
        {
          name: "CES",
          values: report.trend.map((row) => row.ces ?? 0),
        },
        {
          name: "NPS",
          values: report.trend.map((row) => row.nps ?? 0),
        },
      ],
    };
  }

  if (report.trend.length === 1) {
    const row = report.trend[0]!;
    return {
      type: "bar",
      title: "Experience snapshot",
      subtitle: row.label,
      labels: ["CSAT", "CES", "NPS"],
      values: [row.csat ?? 0, row.ces ?? 0, row.nps ?? 0],
    };
  }

  return null;
}

function buildMetricsBarChart(report: DashboardReport): ChatBarChart | null {
  if (!report.csat.count && !report.ces.count && !report.nps.count) return null;

  return {
    type: "bar",
    title: "Metric snapshot",
    subtitle: "CSAT & CES are averages; NPS is the score",
    labels: ["CSAT", "CES", "NPS"],
    values: [
      Number((report.csat.average ?? 0).toFixed(1)),
      Number((report.ces.average ?? 0).toFixed(1)),
      report.nps.score ?? 0,
    ],
  };
}

function buildSentimentDonut(report: DashboardReport): ChatDonutChart | null {
  const total =
    report.positivePercent + report.neutralPercent + report.negativePercent;
  if (!total) return null;

  return {
    type: "donut",
    title: "Sentiment mix",
    segments: [
      { label: "Positive", value: report.positivePercent },
      { label: "Neutral", value: report.neutralPercent },
      { label: "Negative", value: report.negativePercent },
    ],
  };
}

export function buildAnalyticsChartsForQuestion(
  question: string,
  report: DashboardReport
): ChatChart[] {
  const charts: ChatChart[] = [];

  if (THEME_QUESTION.test(question) && report.themes.length > 0) {
    charts.push(buildThemeBarChart(report));
  }

  if (TREND_QUESTION.test(question)) {
    const trendChart = buildTrendChart(report);
    if (trendChart) charts.push(trendChart);
  }

  if (METRICS_QUESTION.test(question)) {
    const metricsChart = buildMetricsBarChart(report);
    if (metricsChart && !charts.some((chart) => chart.title === metricsChart.title)) {
      charts.push(metricsChart);
    }
  }

  if (SENTIMENT_QUESTION.test(question)) {
    const sentimentChart = buildSentimentDonut(report);
    if (
      sentimentChart &&
      !charts.some((chart) => chart.title === sentimentChart.title)
    ) {
      charts.push(sentimentChart);
    }
  }

  return charts.slice(0, 3).map(normalizeChart);
}

export function resolveChatCharts(
  question: string,
  report: DashboardReport,
  modelCharts: ChatChart[]
): ChatChart[] {
  const analyticsCharts = buildAnalyticsChartsForQuestion(question, report);
  const normalizedModelCharts = modelCharts.map(normalizeChart);

  if (!normalizedModelCharts.length) {
    return analyticsCharts.slice(0, 3);
  }

  const merged: ChatChart[] = [...normalizedModelCharts];
  for (const chart of analyticsCharts) {
    if (merged.length >= 3) break;
    const duplicate = merged.some(
      (existing) =>
        existing.type === chart.type &&
        existing.title.toLowerCase() === chart.title.toLowerCase()
    );
    if (!duplicate) merged.push(chart);
  }

  if (
    THEME_QUESTION.test(question) &&
    report.themes.length > 0 &&
    !merged.some(
      (chart) => chart.type === "bar" && /theme/i.test(chart.title.toLowerCase())
    )
  ) {
    return [buildThemeBarChart(report), ...merged].slice(0, 3);
  }

  return merged.slice(0, 3);
}

export const CHAT_CHART_SYSTEM_INSTRUCTIONS = `Return a single JSON object with this shape:
{
  "answer": "concise analyst prose",
  "charts": []
}

Chart rules:
- Include 1-3 charts when the question involves metrics, trends, distributions, mixes, or theme counts.
- Theme or driver questions must include a bar chart of leading themes with mention counts.
- Omit charts for yes/no answers, simple counts with no comparison, or when the data is insufficient.
- Use only numbers from the provided analytics and response context. Do not invent values.
- Chart types (use only these three):
  1. "line" — time trends with 2+ periods. labels = periods, series = [{ name, values }].
  2. "bar" — single-period metric snapshots, distributions, theme counts, or comparisons. labels + values arrays.
  3. "donut" — sentiment mix, NPS promoters/neutral/detractors, or share breakdowns. segments = [{ label, value }].
- For one month or one period only, use a "bar" chart (not line).
- Keep chart titles short. Optional subtitle for scale context (e.g. "CSAT scale 1-5").
- Write the answer as readable prose in the answer field only. Never paste raw JSON in the answer.
- Use [source: company name] when citing a specific response.`;
