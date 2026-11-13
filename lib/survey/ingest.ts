import { randomUUID } from "node:crypto";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { recomputeAggregates } from "@/lib/aggregate";
import type { Prisma } from "@prisma/client";
import { runAfterResponse } from "@/lib/background";
import { emitEventSafely } from "@/lib/events/emit";
import { getFlagMode } from "@/lib/flags";
import { enqueueJob } from "@/lib/jobs/queue";
import { TYPED_CONVERSATION_PREFIX } from "@/lib/survey/constants";
import {
  buildEmbeddingContent,
  embedText,
  generateInsight,
  INSIGHT_MODEL,
  parseInsight,
  type Insight,
} from "@/lib/insight";
import {
  isCompleteSurveyResponse,
  overallSentimentFromScores,
} from "@/lib/survey/metrics";
import {
  calendarQuarterRange,
  normalizeRespondentEmail,
} from "@/lib/survey/quarterly-overwrite";
import type { NormalizedSurveyInput } from "@/lib/survey/schema";
import {
  completeSurveyInviteForResponse,
  reconcileVoiceInviteCompletion,
  syncUncompletedInvitesWithResponses,
  tryCompleteInviteForConversation,
} from "@/lib/survey-invite-tracking";
import { sendSurveyCompletionNotifications } from "@/lib/survey-thankyou-email";

type EnrichmentContext = {
  responseId: string;
  input: NormalizedSurveyInput;
  isComplete: boolean;
  completedAt: Date | null;
};

/**
 * Soft-exclude earlier responses from the same email in the same UTC calendar
 * quarter so KPIs keep only the latest submission.
 */
export async function excludePriorQuarterResponsesForEmail(input: {
  keepResponseId: string;
  email: string | null | undefined;
  completedAt: Date;
}) {
  const email = normalizeRespondentEmail(input.email);
  if (!email) return { excludedCount: 0 };

  const { start, end } = calendarQuarterRange(input.completedAt);

  const duplicates = await db.response.findMany({
    where: {
      id: { not: input.keepResponseId },
      excludedAt: null,
      completedAt: { gte: start, lt: end },
      OR: [
        { client: { email: { equals: email, mode: "insensitive" } } },
        {
          surveyInvite: {
            email: { equals: email, mode: "insensitive" },
          },
        },
      ],
    },
    select: { id: true },
  });

  if (!duplicates.length) return { excludedCount: 0 };

  const reason = `Superseded by newer response in ${start.getUTCFullYear()}-Q${Math.floor(start.getUTCMonth() / 3) + 1}`;
  await db.response.updateMany({
    where: { id: { in: duplicates.map((row) => row.id) } },
    data: {
      excludedAt: new Date(),
      exclusionReason: reason,
      excludedByUserId: null,
    },
  });

  await writeAuditLog({
    actorType: "system",
    action: "response.auto_excluded",
    resourceType: "Response",
    resourceId: input.keepResponseId,
    metadata: {
      reason,
      supersededResponseIds: duplicates.map((row) => row.id),
    },
    source: "worker",
  });

  return { excludedCount: duplicates.length };
}

/**
 * Resolve the overwrite email from invite-verified sources only (invite token,
 * or the invite already linked by conversation/response). A self-reported
 * typed email is never trusted here: anyone could otherwise submit a survey
 * with someone else's email and soft-exclude their genuine response.
 */
export async function resolveQuarterlyOverwriteEmail(input: {
  email?: string | null;
  inviteToken?: string | null;
  conversationId?: string | null;
  responseId?: string | null;
}): Promise<string | null> {
  if (input.inviteToken) {
    const byToken = await db.surveyInvite.findUnique({
      where: { token: input.inviteToken },
      select: { email: true },
    });
    const fromToken = normalizeRespondentEmail(byToken?.email);
    if (fromToken) return fromToken;
  }

  if (input.conversationId) {
    const byConversation = await db.surveyInvite.findUnique({
      where: { conversationId: input.conversationId },
      select: { email: true },
    });
    const fromConversation = normalizeRespondentEmail(byConversation?.email);
    if (fromConversation) return fromConversation;
  }

  if (input.responseId) {
    const byResponse = await db.surveyInvite.findUnique({
      where: { responseId: input.responseId },
      select: { email: true },
    });
    const fromResponse = normalizeRespondentEmail(byResponse?.email);
    if (fromResponse) return fromResponse;
  }

  return null;
}

/**
 * The durable half of ingest: everything that must be on disk before the
 * caller is told the survey was accepted. Fast — a couple of database round
 * trips.
 */
async function storeSurveyResponse(input: NormalizedSurveyInput) {
  const existing = await db.response.findUnique({
    where: { conversationId: input.conversationId },
    select: {
      id: true,
      clientId: true,
      completedAt: true,
      excludedByUserId: true,
    },
  });
  // Re-submits clear system (quarterly) exclusions but never an admin's.
  const preserveAdminExclusion = Boolean(existing?.excludedByUserId);
  const csatScore = findMetricScore(input.answers, "csat", 1) ?? null;
  const cesScore = findMetricScore(input.answers, "ces", 2) ?? null;
  const npsScore = findMetricScore(input.answers, "nps", 3) ?? null;
  const isComplete = isCompleteSurveyResponse({ csatScore, cesScore, npsScore });
  const completedAt = isComplete
    ? (input.completedAt ?? existing?.completedAt ?? new Date())
    : null;
  const clientData =
    input.clientName || input.email || input.company || input.designation
      ? {
          name: input.clientName,
          email: input.email,
          company: input.company,
          designation: input.designation,
          locale: input.language,
        }
      : undefined;

  const response = await db.response.upsert({
    where: { conversationId: input.conversationId },
    update: {
      answers: input.answers,
      rawPayload: input.rawPayload,
      language: input.language,
      surveyVersion: input.surveyVersion,
      avgRating: csatScore,
      csatScore,
      cesScore,
      npsScore,
      startedAt: input.startedAt,
      completedAt,
      ...(preserveAdminExclusion
        ? {}
        : { excludedAt: null, excludedByUserId: null, exclusionReason: null }),
      client: clientData
        ? {
            upsert: {
              create: clientData,
              update: clientData,
            },
          }
        : undefined,
    },
    create: {
      conversationId: input.conversationId,
      answers: input.answers,
      rawPayload: input.rawPayload,
      language: input.language,
      surveyVersion: input.surveyVersion,
      avgRating: csatScore,
      csatScore,
      cesScore,
      npsScore,
      startedAt: input.startedAt,
      completedAt,
      client: clientData ? { create: clientData } : undefined,
    },
  });

  if (isComplete && completedAt) {
    const email = await resolveQuarterlyOverwriteEmail({
      email: input.email,
      inviteToken: input.inviteToken,
      conversationId: input.conversationId,
      responseId: response.id,
    });
    await excludePriorQuarterResponsesForEmail({
      keepResponseId: response.id,
      email,
      completedAt,
    });
    await emitEventSafely({
      type: "SURVEY_RESPONSE_SUBMITTED",
      idempotencyKey: `response:${response.id}:submitted`,
      aggregateId: response.id,
      payload: {
        responseId: response.id,
        surveyVersion: input.surveyVersion,
        source: input.conversationId.startsWith(TYPED_CONVERSATION_PREFIX)
          ? "typed"
          : "voice",
      },
    });
  }

  return {
    responseId: response.id,
    created: !existing,
    enrichment: {
      responseId: response.id,
      input,
      isComplete,
      completedAt,
    } satisfies EnrichmentContext,
  };
}

/**
 * The slow half: GPT insight, embedding, invite completion, email notification
 * and aggregate recompute (which itself calls OpenAI for theme summaries).
 * Every step is individually guarded, so a failure here never invalidates the
 * stored response — a webhook retry or the backfill script fills the gap.
 */
async function enrichSurveyResponse({
  responseId,
  input,
  isComplete,
  completedAt,
}: EnrichmentContext) {
  try {
    await ensureInsightAndEmbedding(
      responseId,
      input.answers,
      input.language,
      {
        fullName: input.clientName,
        company: input.company,
        designation: input.designation,
      }
    );
  } catch (error) {
    console.error("insight generation failed:", error);
  }

  try {
    if (isComplete) {
      if (!input.conversationId.startsWith("typed_")) {
        await syncUncompletedInvitesWithResponses();
      }

      const linked = await completeSurveyInviteForResponse(
        responseId,
        {
          inviteToken: input.inviteToken,
          conversationId: input.conversationId,
        },
        completedAt ?? undefined
      );

      if (
        !linked &&
        !input.inviteToken &&
        !input.conversationId.startsWith("typed_")
      ) {
        await reconcileVoiceInviteCompletion({
          responseId,
          conversationId: input.conversationId,
          completedAt: completedAt ?? undefined,
        });
        await tryCompleteInviteForConversation(input.conversationId);
      }

      // Voice webhooks often link the invite only during enrichment. Re-run
      // quarterly overwrite once the invite email is attached.
      if (completedAt) {
        const email = await resolveQuarterlyOverwriteEmail({
          email: input.email,
          inviteToken: input.inviteToken,
          conversationId: input.conversationId,
          responseId,
        });
        await excludePriorQuarterResponsesForEmail({
          keepResponseId: responseId,
          email,
          completedAt,
        });
      }
    }
  } catch (error) {
    console.error("survey invite completion failed:", error);
  }

  if (isComplete) {
    try {
      await sendSurveyCompletionNotifications(responseId);
    } catch (error) {
      console.error("survey completion notifications failed:", error);
    }
  }

  try {
    await recomputeAggregates();
  } catch (error) {
    console.error("aggregate recompute failed:", error);
  }
}

/**
 * Store and enrich, awaiting both. Callers get a fully enriched response but
 * wait for the AI and email work — appropriate for scripts and backfills.
 */
export async function ingestSurveyResponse(input: NormalizedSurveyInput) {
  const stored = await storeSurveyResponse(input);
  await enrichSurveyResponse(stored.enrichment);

  return {
    responseId: stored.responseId,
    created: stored.created,
  };
}

/**
 * Store durably, return immediately, enrich in the background.
 *
 * Used by the request paths. Enrichment takes 10-30s (gpt-4o insight,
 * embedding, email, then aggregate recompute which calls OpenAI again), and
 * making callers wait for it meant the typed survey left respondents staring
 * at a spinner after pressing submit, and the ElevenLabs webhook risked
 * exceeding the reverse proxy timeout and being retried — redoing all of the
 * AI work at full cost.
 *
 * Safe to defer because the response row is already committed and every
 * enrichment step is individually guarded and idempotent. With the
 * `jobs.background_work` flag live, enrichment runs on the job queue (retried,
 * survives restarts); otherwise it runs via after() in this process.
 */
export async function ingestSurveyResponseDeferred(
  input: NormalizedSurveyInput
) {
  const stored = await storeSurveyResponse(input);

  if (!(await enqueueEnrichment(stored.enrichment))) {
    runAfterResponse("deferred survey enrichment", () =>
      enrichSurveyResponse(stored.enrichment)
    );
  }

  return {
    responseId: stored.responseId,
    created: stored.created,
  };
}

type EnrichmentJobPayload = {
  responseId: string;
  isComplete: boolean;
  completedAt: string | null;
  input: Omit<NormalizedSurveyInput, "rawPayload" | "startedAt" | "completedAt"> & {
    startedAt: string | null;
    completedAt: string | null;
  };
};

async function enqueueEnrichment(context: EnrichmentContext) {
  try {
    if ((await getFlagMode("jobs.background_work")) !== "live") return false;
    const { rawPayload: _rawPayload, startedAt, completedAt, ...rest } = context.input;
    void _rawPayload;
    const payload: EnrichmentJobPayload = {
      responseId: context.responseId,
      isComplete: context.isComplete,
      completedAt: context.completedAt?.toISOString() ?? null,
      input: {
        ...rest,
        startedAt: startedAt?.toISOString() ?? null,
        completedAt: completedAt?.toISOString() ?? null,
      },
    };
    await enqueueJob({
      type: "response.enrich",
      jobKey: `response.enrich:${context.responseId}:${context.isComplete ? "complete" : "partial"}`,
      payload: payload as unknown as Prisma.InputJsonValue,
    });
    return true;
  } catch (error) {
    console.error("enrichment enqueue failed; running inline:", error);
    return false;
  }
}

/** Job entry point for `response.enrich`. */
export async function runEnrichmentJob(raw: unknown) {
  const payload = raw as EnrichmentJobPayload;
  if (!payload?.responseId || !payload.input) {
    throw new Error("response.enrich: malformed payload");
  }
  await enrichSurveyResponse({
    responseId: payload.responseId,
    isComplete: payload.isComplete,
    completedAt: payload.completedAt ? new Date(payload.completedAt) : null,
    input: {
      ...payload.input,
      rawPayload: {},
      startedAt: payload.input.startedAt ? new Date(payload.input.startedAt) : undefined,
      completedAt: payload.input.completedAt ? new Date(payload.input.completedAt) : undefined,
    },
  });
}

function findMetricScore(
  answers: NormalizedSurveyInput["answers"],
  metric: "csat" | "ces" | "nps",
  questionNumber: number
) {
  return answers.find(
    (answer) =>
      answer.metric === metric ||
      (!answer.metric && answer.question_number === questionNumber)
  )?.rating;
}

async function ensureInsightAndEmbedding(
  responseId: string,
  answers: NormalizedSurveyInput["answers"],
  language: string,
  identity: {
    fullName?: string;
    company?: string;
    designation?: string;
  }
) {
  const existingInsight = await db.responseInsight.findUnique({
    where: { responseId },
  });
  let insight: Insight;

  // Overall sentiment is deterministic (combined score out of 22), not the
  // GPT label, whenever all three metrics were collected.
  const combinedSentiment = overallSentimentFromScores({
    csatScore: findMetricScore(answers, "csat", 1),
    cesScore: findMetricScore(answers, "ces", 2),
    npsScore: findMetricScore(answers, "nps", 3),
  });

  if (existingInsight) {
    insight = parseInsight({
      overallSentiment: combinedSentiment ?? existingInsight.overallSentiment,
      satisfactionSummary: existingInsight.satisfactionSummary,
      keyDrivers: existingInsight.keyDrivers,
      riskSignals: existingInsight.riskSignals,
      suggestedReply: existingInsight.suggestedReply,
      nextSteps: existingInsight.nextSteps,
    });
    if (combinedSentiment && existingInsight.overallSentiment !== combinedSentiment) {
      await db.responseInsight.update({
        where: { responseId },
        data: { overallSentiment: combinedSentiment },
      });
    }
  } else {
    const generated = await generateInsight(answers, language);
    insight = combinedSentiment
      ? { ...generated, overallSentiment: combinedSentiment }
      : generated;
    await db.responseInsight.create({
      data: {
        responseId,
        overallSentiment: insight.overallSentiment,
        satisfactionSummary: insight.satisfactionSummary,
        keyDrivers: insight.keyDrivers,
        riskSignals: insight.riskSignals,
        suggestedReply: insight.suggestedReply,
        nextSteps: insight.nextSteps,
        modelVersion: INSIGHT_MODEL,
      },
    });
  }

  const existingEmbedding = await db.responseEmbedding.findUnique({
    where: { responseId },
    select: { id: true },
  });
  if (existingEmbedding) return;

  const content = buildEmbeddingContent(answers, insight, identity);
  const embedding = await embedText(content);
  await db.$executeRawUnsafe(
    `INSERT INTO "ResponseEmbedding" (id, "responseId", content, embedding, "createdAt")
     VALUES ($1, $2, $3, $4::vector, now())
     ON CONFLICT ("responseId") DO UPDATE
     SET content = EXCLUDED.content,
         embedding = EXCLUDED.embedding,
         "createdAt" = now()`,
    randomUUID(),
    responseId,
    content,
    `[${embedding.join(",")}]`
  );
}
