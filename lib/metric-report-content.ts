import type { DashboardInsight } from "@/components/dashboard/types";
import type { DashboardReport } from "@/lib/dashboard-analytics";
import {
  buildCesBuckets,
  buildCsatBuckets,
  buildNpsBuckets,
  cesScaleColor,
  csatScaleColor,
  distributionToChartData,
  METRIC_IDENTITY_COLORS,
  npsScaleColor,
  type RatingBucket,
} from "@/lib/rating-visuals";
import { SURVEY_QUESTIONS } from "@/lib/survey/constants";

export type MetricKind = "csat" | "nps" | "ces";

export type MetricQuote = {
  responseId: string;
  text: string;
  company: string;
  rating: number;
};

export type MetricReportContent = {
  kind: MetricKind;
  title: string;
  accent: string;
  question: string;
  surveyQuestion: string;
  scoreDisplay: string;
  meta: string;
  statusLabel: string;
  statusTone: "hit" | "grow";
  buckets: RatingBucket[];
  distributionChart: ReturnType<typeof distributionToChartData>;
  scaleCells: Array<{ rating: string; label: string; description: string; tone: string }>;
  scaleFormula: string;
  globalConversion: {
    localLabel: string;
    localValue: string;
    globalLabel: string;
    globalValue: string;
    note: string;
  };
  insightTitle: string;
  insightBody: string;
  improvementTitle: string;
  improvementBody: string;
};

const METRIC_QUESTIONS = Object.fromEntries(
  SURVEY_QUESTIONS.map((definition) => [definition.metric, definition.question])
) as Record<MetricKind, string>;

const METRIC_SURVEY_QUESTIONS: Record<MetricKind, string> = {
  csat:
    "For the first question, please use a CSAT scale from one to five, where one means extremely dissatisfied and five means extremely satisfied. How satisfied are you with the overall quality of services provided by RSM in Kuwait? Please provide a rating from one to five.",
  ces:
    "For the second question, please use a CES scale from one to seven, where one means very difficult and seven means very easy. How easy was it to work with RSM in Kuwait's team throughout your service experience? Please provide a rating from one to seven.",
  nps:
    "For the final question, please use an NPS scale from zero to ten, where zero means you would strongly not recommend and ten means you are extremely likely to recommend. How likely are you to recommend RSM in Kuwait to others? Please provide a rating from zero to ten.",
};

export function buildMetricReportContent(
  kind: MetricKind,
  report: DashboardReport,
  responseCount: number
): MetricReportContent {
  switch (kind) {
    case "csat":
      return buildCsatContent(report, responseCount);
    case "nps":
      return buildNpsContent(report, responseCount);
    case "ces":
      return buildCesContent(report, responseCount);
  }
}

export function extractMetricQuotes(
  items: DashboardInsight[],
  kind: MetricKind,
  limit = 4
): MetricQuote[] {
  const minRating = kind === "nps" ? 9 : kind === "ces" ? 6 : 4;

  return items
    .map((item) => {
      const answer = item.answers.find((entry) => entry.metric === kind);
      const comment = answer?.comments?.trim();
      if (!answer || !comment || answer.rating < minRating) return null;

      return {
        responseId: item.responseId,
        text: comment,
        company: item.client?.company?.trim() || "Client",
        rating: answer.rating,
      };
    })
    .filter((quote): quote is MetricQuote => quote !== null)
    .slice(0, limit);
}

function buildCsatContent(
  report: DashboardReport,
  responseCount: number
): MetricReportContent {
  const { csat } = report;
  const buckets = buildCsatBuckets(csat.distribution);
  const positiveCount = buckets[0].count + buckets[1].count;
  const average = csat.average;

  return {
    kind: "csat",
    title: "Customer Satisfaction (CSAT)",
    accent: METRIC_IDENTITY_COLORS.csat,
    question: METRIC_QUESTIONS.csat,
    surveyQuestion: METRIC_SURVEY_QUESTIONS.csat,
    scoreDisplay: `${csat.favorablePercent}%`,
    meta: `${positiveCount} of ${csat.count} clients rated 4 or 5 · ${responseCount} total responses in period`,
    statusLabel:
      csat.favorablePercent >= 80 ? "Strong satisfaction" : "Room to improve",
    statusTone: csat.favorablePercent >= 80 ? "hit" : "grow",
    buckets,
    distributionChart: distributionToChartData(
      csat.distribution,
      1,
      csatScaleColor
    ),
    scaleCells: [
      {
        rating: "5",
        label: "Very satisfied",
        description: "Exceptional delivery, exceeds expectations",
        tone: "positive",
      },
      {
        rating: "4",
        label: "Satisfied",
        description: "Quality met, professional service delivered",
        tone: "positive",
      },
      {
        rating: "3",
        label: "Somewhat satisfied",
        description: "Acceptable but room to improve",
        tone: "neutral",
      },
      {
        rating: "1–2",
        label: "Dissatisfied",
        description: "Service fell below expectations",
        tone: "negative",
      },
    ],
    scaleFormula: "Scores 4 and 5 count as positive. CSAT = (4s + 5s) ÷ total × 100.",
    globalConversion: {
      localLabel: "RSM 1–5 scale",
      localValue: `${csat.favorablePercent}%`,
      globalLabel: "Average score",
      globalValue: average === null ? "—" : `${average.toFixed(1)} / 5`,
      note:
        average === null
          ? "Average score appears once CSAT ratings are collected."
          : `An average of ${average.toFixed(1)} out of 5 reflects the overall satisfaction level across rated responses.`,
    },
    insightTitle: "CSAT: Service quality snapshot",
    insightBody: `${csat.favorablePercent}% of rated responses are positive (4 or 5). ${buckets[3].count} dissatisfied response${buckets[3].count === 1 ? "" : "s"} in this period.`,
    improvementTitle: "Consistency",
    improvementBody:
      "Sustain strong scores through clear communication, predictable delivery, and consistent engagement across service lines.",
  };
}

function buildNpsContent(
  report: DashboardReport,
  responseCount: number
): MetricReportContent {
  const { nps } = report;

  return {
    kind: "nps",
    title: "Net Promoter Score (NPS)",
    accent: METRIC_IDENTITY_COLORS.nps,
    question: METRIC_QUESTIONS.nps,
    surveyQuestion: METRIC_SURVEY_QUESTIONS.nps,
    scoreDisplay: nps.score === null ? "—" : String(Math.round(nps.score)),
    meta: `${nps.promoters} promoters · ${nps.passives} neutral · ${nps.detractors} detractors · ${responseCount} total responses in period`,
    statusLabel: (nps.score ?? 0) >= 50 ? "Strong advocacy" : "Growth opportunity",
    statusTone: (nps.score ?? 0) >= 50 ? "hit" : "grow",
    buckets: buildNpsBuckets(nps.promoters, nps.passives, nps.detractors),
    distributionChart: distributionToChartData(
      nps.distribution,
      0,
      npsScaleColor
    ),
    scaleCells: [
      {
        rating: "9–10",
        label: "Promoters",
        description: "Actively recommends RSM to others",
        tone: "positive",
      },
      {
        rating: "7–8",
        label: "Neutral",
        description: "Satisfied but not an active advocate",
        tone: "neutral",
      },
      {
        rating: "0–6",
        label: "Detractors",
        description: "Unlikely to recommend; may spread negative sentiment",
        tone: "negative",
      },
    ],
    scaleFormula:
      "NPS = % promoters − % detractors on the 0–10 recommendation scale.",
    globalConversion: {
      localLabel: "NPS score",
      localValue: nps.score === null ? "—" : String(Math.round(nps.score)),
      globalLabel: "Promoter share",
      globalValue: `${nps.promoterPercent}%`,
      note: `${nps.passives} neutral responses are the primary lever for improving advocacy in this period.`,
    },
    insightTitle: "NPS: Advocacy and recommendation strength",
    insightBody: `NPS of ${nps.score ?? "—"} reflects ${nps.promoters} promoters and ${nps.detractors} detractors. The neutral group (${nps.passives}) represents the largest conversion opportunity.`,
    improvementTitle: "Advocacy (NPS)",
    improvementBody:
      "Clearer expectation-setting during project initiation and regular engagement partner check-ins can help convert neutral clients into promoters.",
  };
}

function buildCesContent(
  report: DashboardReport,
  responseCount: number
): MetricReportContent {
  const { ces } = report;
  const buckets = buildCesBuckets(ces.distribution);
  const easyCount = buckets[0].count + buckets[1].count;

  return {
    kind: "ces",
    title: "Customer Effort Score (CES)",
    accent: METRIC_IDENTITY_COLORS.ces,
    question: METRIC_QUESTIONS.ces,
    surveyQuestion: METRIC_SURVEY_QUESTIONS.ces,
    scoreDisplay: ces.average === null ? "—" : `${ces.average.toFixed(1)} / 7`,
    meta: `${easyCount} rated easy or very easy · ${ces.favorablePercent}% favorable · ${responseCount} total responses in period`,
    statusLabel: (ces.average ?? 0) >= 5 ? "Low client effort" : "Friction to address",
    statusTone: (ces.average ?? 0) >= 5 ? "hit" : "grow",
    buckets,
    distributionChart: distributionToChartData(
      ces.distribution,
      1,
      cesScaleColor
    ),
    scaleCells: [
      {
        rating: "6–7",
        label: "Very easy",
        description: "Effortless, proactive, no friction",
        tone: "positive",
      },
      {
        rating: "5",
        label: "Easy",
        description: "Smooth collaboration, responsive team",
        tone: "positive",
      },
      {
        rating: "4",
        label: "Neutral",
        description: "Some effort required from the client",
        tone: "neutral",
      },
      {
        rating: "1–3",
        label: "Difficult",
        description: "High client effort or barriers to engagement",
        tone: "negative",
      },
    ],
    scaleFormula:
      "CES = sum of all effort scores ÷ number of responses on the 1–7 scale.",
    globalConversion: {
      localLabel: "RSM 1–7 scale",
      localValue: ces.average === null ? "—" : `${ces.average.toFixed(1)} / 7`,
      globalLabel: "Favorable share",
      globalValue: `${ces.favorablePercent}%`,
      note: `${buckets[3].count} difficult response${buckets[3].count === 1 ? "" : "s"} warrant follow-up when effort scores fall below 5.`,
    },
    insightTitle: "CES: Ease of engagement",
    insightBody: `Average effort score is ${ces.average?.toFixed(1) ?? "—"} out of 7 with ${ces.favorablePercent}% favorable ratings. ${easyCount} clients rated the experience easy or very easy.`,
    improvementTitle: "Visibility",
    improvementBody:
      "Client-facing status updates and clearer next-action summaries reduce the effort clients need to track engagement progress.",
  };
}
