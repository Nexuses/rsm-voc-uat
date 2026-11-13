import { getSurveyUrl } from "@/lib/app-base-url";
import { buildResultLinkUrl } from "@/lib/crm/status-webhook";
import { db } from "@/lib/db";
import { crmSentimentFromScores } from "@/lib/survey/metrics";
import type { Prisma } from "@prisma/client";

type AnswerRow = {
  question_number?: number;
  question_text?: string;
  rating?: number | null;
  reason_text?: string | null;
};

function readAnswers(answers: Prisma.JsonValue): AnswerRow[] {
  if (!Array.isArray(answers)) return [];
  return answers as AnswerRow[];
}

function commentForQuestion(answers: AnswerRow[], questionNumber: number) {
  const row = answers.find((item) => item.question_number === questionNumber);
  const text = row?.reason_text?.trim();
  return text || null;
}

/**
 * Completion payload schema for RSM CRM / Power Automate consumers.
 * Included on the `completed` CRM status webhook as `scores`.
 */
export async function buildSurveyCompletionPayload(inviteId: string) {
  const invite = await db.surveyInvite.findUnique({
    where: { id: inviteId },
    include: {
      response: {
        select: {
          id: true,
          csatScore: true,
          cesScore: true,
          npsScore: true,
          answers: true,
          completedAt: true,
          language: true,
          surveyVersion: true,
        },
      },
    },
  });

  if (!invite?.response) return null;

  const answers = readAnswers(invite.response.answers);

  return {
    schemaVersion: "1.0" as const,
    inviteId: invite.id,
    responseId: invite.response.id,
    externalEngagementId: invite.externalEngagementId,
    triggerStage: invite.triggerStage,
    projectId: invite.projectId,
    idempotencyKey: invite.idempotencyKey,
    email: invite.email,
    language: invite.response.language,
    surveyVersion: invite.response.surveyVersion,
    completedAt: (
      invite.response.completedAt ??
      invite.completedAt ??
      new Date()
    ).toISOString(),
    surveyUrl: `${getSurveyUrl()}?invite=${encodeURIComponent(invite.token)}`,
    resultLinkUrl: buildResultLinkUrl(invite.resultToken),
    /**
     * Collective rating from combined CSAT+CES+NPS out of 22 (same bands as
     * completion emails): below 60% Dissatisfied, 60–80% Neutral, above 80% Satisfied.
     */
    sentiment: crmSentimentFromScores({
      csatScore: invite.response.csatScore,
      cesScore: invite.response.cesScore,
      npsScore: invite.response.npsScore,
    }),
    scores: {
      csat: {
        scale: { min: 1, max: 5 },
        value: invite.response.csatScore,
        comment: commentForQuestion(answers, 1),
      },
      ces: {
        scale: { min: 1, max: 7 },
        value: invite.response.cesScore,
        comment: commentForQuestion(answers, 2),
      },
      nps: {
        scale: { min: 0, max: 10 },
        value: invite.response.npsScore,
        comment: commentForQuestion(answers, 3),
      },
    },
  };
}
