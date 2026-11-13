import type { Prisma } from "@prisma/client";
import {
  buildDashboardReport,
  formatDashboardReportContext,
  withinDashboardWindow,
  type DashboardAnalyticsItem,
  type DashboardWindow,
} from "@/lib/dashboard-analytics";
import {
  cxResponseInsightsSelect,
  getResponseSource,
  type CxInsightResponse,
} from "@/lib/cx-response-select";
import { db } from "@/lib/db";
import { getSurveyQuestion } from "@/lib/survey/constants";
import { resolveOverallSentiment } from "@/lib/survey/metrics";

export async function loadDashboardAnalyticsItems(
  window: DashboardWindow = "all",
  scopeWhere: Prisma.ResponseWhereInput = {}
) {
  const responses = await db.response.findMany({
    where: { AND: [{ excludedAt: null }, scopeWhere] },
    orderBy: { createdAt: "desc" },
    select: cxResponseInsightsSelect,
    take: 500,
  });

  return responses
    .map(toDashboardAnalyticsItem)
    .filter((item) => withinDashboardWindow(item.submittedAt, window));
}

export function buildDashboardAnalyticsContext(
  items: DashboardAnalyticsItem[],
  window: DashboardWindow
) {
  const report = buildDashboardReport(items);
  return formatDashboardReportContext(report, window, items.length);
}

function toDashboardAnalyticsItem(
  response: CxInsightResponse
): DashboardAnalyticsItem {
  const answers = normalizeAnswers(response.answers);
  return {
    responseId: response.id,
    submittedAt: (response.completedAt ?? response.createdAt).toISOString(),
    company: response.client?.company?.trim() || null,
    clientName: response.client?.name?.trim() || null,
    source: getResponseSource(response.conversationId),
    sentiment: resolveOverallSentiment({
      csatScore: response.csatScore,
      cesScore: response.cesScore,
      npsScore: response.npsScore,
      storedSentiment: response.insight?.overallSentiment,
    }),
    metrics: {
      csat: response.csatScore,
      ces: response.cesScore,
      nps: response.npsScore,
    },
    keyDrivers: stringList(response.insight?.keyDrivers),
    riskSignals: stringList(response.insight?.riskSignals),
    answers,
  };
}

function normalizeAnswers(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((answer) => {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
      return [];
    }

    const record = answer as Record<string, unknown>;
    const questionNumber =
      typeof record.question_number === "number" ? record.question_number : 1;
    if (typeof record.rating !== "number") return [];

    const definition = getSurveyQuestion(questionNumber);
    const metric =
      typeof record.metric === "string" &&
      (record.metric === "csat" ||
        record.metric === "ces" ||
        record.metric === "nps")
        ? record.metric
        : definition?.metric ?? null;

    return [
      {
        questionNumber,
        metric,
        rating: record.rating,
      },
    ];
  });
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
