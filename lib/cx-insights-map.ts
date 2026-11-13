import type {
  DashboardInsight,
  DashboardSentiment,
} from "@/components/dashboard/types";
import {
  getResponseSource,
  type CxInsightResponse,
} from "@/lib/cx-response-select";
import { getSurveyQuestion } from "@/lib/survey/constants";
import { resolveOverallSentiment } from "@/lib/survey/metrics";

function toDashboardSentiment(value: string | null | undefined): DashboardSentiment | null {
  if (value === "positive" || value === "neutral" || value === "negative") {
    return value;
  }
  return null;
}

export function normalizeInsightAnswers(
  value: unknown
): DashboardInsight["answers"] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((answer) => {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
      return [];
    }

    const record = answer as Record<string, unknown>;
    const questionNumber =
      typeof record.question_number === "number" ? record.question_number : 1;
    if (typeof record.rating !== "number") return [];

    const storedQuestion =
      typeof record.question_text === "string" && record.question_text.trim()
        ? record.question_text.trim()
        : undefined;
    const definition = getSurveyQuestion(questionNumber);

    return [
      {
        questionNumber,
        question:
          storedQuestion ?? definition?.question ?? `Question ${questionNumber}`,
        metric:
          typeof record.metric === "string"
            ? (record.metric as DashboardInsight["answers"][number]["metric"])
            : (definition?.metric ?? null),
        scaleMin:
          typeof record.scale_min === "number"
            ? record.scale_min
            : (definition?.min ?? null),
        scaleMax:
          typeof record.scale_max === "number"
            ? record.scale_max
            : (definition?.max ?? null),
        rating: record.rating,
        comments:
          typeof record.reason_text === "string" ? record.reason_text : null,
        method:
          typeof record.reason_method === "string"
            ? record.reason_method
            : null,
      },
    ];
  });
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function mapCxResponseToDashboardInsight(
  response: CxInsightResponse
): DashboardInsight {
  const suggested = response.insight?.suggestedReply;
  const suggestedReply =
    suggested && typeof suggested === "object" && !Array.isArray(suggested)
      ? (suggested as { en?: string; ar?: string })
      : {};

  return {
    responseId: response.id,
    conversationId: response.conversationId,
    source: getResponseSource(response.conversationId),
    language: response.language,
    submittedAt: (response.completedAt ?? response.createdAt).toISOString(),
    department: response.surveyInvite?.department?.trim() || null,
    partner: response.surveyInvite?.partner?.trim() || null,
    serviceName: response.surveyInvite?.serviceName?.trim() || null,
    businessManagerName: response.surveyInvite?.businessManagerName?.trim() || null,
    jobManagerName: response.surveyInvite?.jobManagerName?.trim() || null,
    client: response.client
      ? {
          name: response.client.name,
          company: response.client.company,
          designation: response.client.designation,
          // Voice never asks for email; tracked invites carry it on SurveyInvite.
          email: response.client.email ?? response.surveyInvite?.email ?? null,
          tier: response.client.tier,
        }
      : response.surveyInvite?.email
        ? {
            name: null,
            company: null,
            designation: null,
            email: response.surveyInvite.email,
            tier: null,
          }
        : null,
    surveyVersion: response.surveyVersion,
    metrics: {
      csat: response.csatScore,
      ces: response.cesScore,
      nps: response.npsScore,
    },
    avgRating: response.avgRating,
    sentiment: toDashboardSentiment(
      resolveOverallSentiment({
        csatScore: response.csatScore,
        cesScore: response.cesScore,
        npsScore: response.npsScore,
        storedSentiment: response.insight?.overallSentiment,
      })
    ),
    summary: response.insight?.satisfactionSummary ?? null,
    keyDrivers: stringList(response.insight?.keyDrivers),
    riskSignals: stringList(response.insight?.riskSignals),
    suggestedReply,
    nextSteps: stringList(response.insight?.nextSteps),
    answers: normalizeInsightAnswers(response.answers),
  };
}
