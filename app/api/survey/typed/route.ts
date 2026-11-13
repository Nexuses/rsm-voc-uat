import { NextRequest, NextResponse } from "next/server";
import {
  SURVEY_QUESTIONS,
  SURVEY_VERSION,
} from "@/lib/survey/constants";
import { ingestSurveyResponseDeferred } from "@/lib/survey/ingest";
import {
  consumeSurveyRateLimit,
  validatePublicPost,
} from "@/lib/survey/request-security";
import { typedSurveySchema } from "@/lib/survey/schema";
import {
  offerTestimonialForResponse,
  resolveInviteIdForToken,
} from "@/lib/testimonials/offer";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function POST(request: NextRequest) {
  const security = validatePublicPost(request);
  if (!security.ok) {
    return NextResponse.json(
      { error: security.error },
      { status: security.status, headers: noStoreHeaders }
    );
  }

  let unknownPayload: unknown;
  try {
    unknownPayload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid JSON" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = typedSurveySchema.safeParse(unknownPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid survey response" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const rateLimit = await consumeSurveyRateLimit(request, "typed");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "too many survey attempts" },
      {
        status: 429,
        headers: {
          ...noStoreHeaders,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  const now = new Date();
  const survey = parsed.data;

  let responseId: string;
  try {
    const stored = await ingestSurveyResponseDeferred({
      source: "typed",
      conversationId: `typed_${survey.submissionId}`,
      clientName: survey.fullName,
      email: survey.email,
      company: survey.company,
      designation: survey.designation,
      surveyVersion: SURVEY_VERSION,
      language: survey.language,
      answers: SURVEY_QUESTIONS.map((definition) => ({
        question_number: definition.questionNumber,
        question_text: definition.question,
        metric: definition.metric,
        scale_min: definition.min,
        scale_max: definition.max,
        rating:
          definition.metric === "csat"
            ? survey.csatRating
            : definition.metric === "ces"
              ? survey.cesRating
              : survey.npsRating,
        reason_text:
          (definition.metric === "csat"
            ? survey.csatComment
            : definition.metric === "ces"
              ? survey.cesComment
              : survey.npsComment) || undefined,
        reason_method: "typed" as const,
      })),
      rawPayload: {
        source: "typed",
        submissionId: survey.submissionId,
        surveyVersion: SURVEY_VERSION,
        language: survey.language,
        fullName: survey.fullName,
        email: survey.email,
        company: survey.company,
        designation: survey.designation,
        csatRating: survey.csatRating,
        csatComment: survey.csatComment,
        cesRating: survey.cesRating,
        cesComment: survey.cesComment,
        npsRating: survey.npsRating,
        npsComment: survey.npsComment,
        receivedAt: now.toISOString(),
      },
      startedAt: now,
      completedAt: now,
      inviteToken: survey.inviteToken,
    });
    responseId = stored.responseId;
  } catch (error) {
    console.error("typed survey ingest failed:", error);
    return NextResponse.json(
      { error: "survey could not be saved" },
      { status: 503, headers: noStoreHeaders }
    );
  }

  // Offer a thank-you-page testimonial link for overall-Positive responses.
  // Failures must not block the survey acknowledgement.
  let testimonial: { kind: "draft_approval" | "original_request"; url: string } | null =
    null;
  try {
    const surveyInviteId = await resolveInviteIdForToken(survey.inviteToken);
    const ask = await offerTestimonialForResponse({
      responseId,
      surveyInviteId,
    });
    if (ask) {
      testimonial = { kind: ask.kind, url: ask.url };
    }
  } catch (error) {
    console.error("typed survey testimonial offer skipped:", error);
  }

  return NextResponse.json(
    { ok: true, testimonial },
    { headers: noStoreHeaders }
  );
}
