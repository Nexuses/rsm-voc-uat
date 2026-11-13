import type { DashboardInsight } from "@/components/dashboard/types";
import type { MetricKind } from "@/lib/metric-report-content";

export type SurveyChannelSegment = {
  id: string;
  label: string;
  detail: string;
  count: number;
  color: string;
};

const CHANNEL_COLORS = {
  english: "#009cde",
  arabic: "#3f9c35",
  voice: "#63666a",
  text: "#888b8d",
} as const;

export function buildSurveyChannelBreakdown(
  items: DashboardInsight[],
  metric: MetricKind
): SurveyChannelSegment[] {
  const withMetric = items.filter((item) => hasMetricRating(item, metric));

  const voiceEnglish = withMetric.filter(
    (item) => item.source === "voice" && normalizeLanguage(item.language) === "en"
  ).length;
  const voiceArabic = withMetric.filter(
    (item) => item.source === "voice" && normalizeLanguage(item.language) === "ar"
  ).length;
  const voiceTotal = withMetric.filter((item) => item.source === "voice").length;
  const typedTotal = withMetric.filter((item) => item.source === "typed").length;

  return [
    {
      id: "english",
      label: "English",
      detail: "Voice survey",
      count: voiceEnglish,
      color: CHANNEL_COLORS.english,
    },
    {
      id: "arabic",
      label: "Arabic",
      detail: "Voice survey",
      count: voiceArabic,
      color: CHANNEL_COLORS.arabic,
    },
    {
      id: "voice",
      label: "Voice",
      detail: "All voice responses",
      count: voiceTotal,
      color: CHANNEL_COLORS.voice,
    },
    {
      id: "text",
      label: "Text",
      detail: "Typed survey",
      count: typedTotal,
      color: CHANNEL_COLORS.text,
    },
  ];
}

function hasMetricRating(item: DashboardInsight, metric: MetricKind) {
  if (item.metrics[metric] !== null) return true;
  return item.answers.some((answer) => answer.metric === metric);
}

function normalizeLanguage(language: string | null | undefined) {
  return language === "ar" ? "ar" : "en";
}
