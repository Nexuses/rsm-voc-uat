import { db } from "@/lib/db";
import { isCompleteSurveyResponse } from "@/lib/survey/metrics";
import { isTestimonialEligible } from "@/lib/testimonials/eligibility";
import {
  markTestimonialRequested,
  prepareThankYouTestimonial,
  type ThankYouTestimonialAsk,
} from "@/lib/testimonials/prepare";

export type TestimonialOfferResult =
  | { status: "ready"; ask: ThankYouTestimonialAsk }
  | { status: "pending" }
  | { status: "ineligible" };

/**
 * Create or reuse a testimonial ask for a stored response when overall
 * Positive. Marks requestedAt so the admin queue sees the ask even when the
 * thank-you email path has not run yet (or never will for walk-ins).
 */
export async function offerTestimonialForResponse(input: {
  responseId: string;
  surveyInviteId?: string | null;
}): Promise<ThankYouTestimonialAsk | null> {
  const response = await db.response.findUnique({
    where: { id: input.responseId },
    select: {
      csatScore: true,
      cesScore: true,
      npsScore: true,
      answers: true,
      surveyInvite: { select: { id: true } },
    },
  });
  if (!response || !isCompleteSurveyResponse(response)) return null;
  if (!isTestimonialEligible(response)) return null;

  const surveyInviteId =
    input.surveyInviteId?.trim() || response.surveyInvite?.id || null;

  const ask = await prepareThankYouTestimonial({
    responseId: input.responseId,
    surveyInviteId,
    scores: response,
    answers: response.answers,
  });
  if (!ask) return null;

  try {
    await markTestimonialRequested(ask.id);
  } catch (error) {
    console.error("testimonial requestedAt update failed", error);
  }

  return ask;
}

/**
 * Public thank-you page lookup by ElevenLabs / typed conversation id.
 * Returns pending until the voice webhook (or typed ingest) has stored the
 * response. Never returns respondent identity.
 */
export async function resolveTestimonialOfferByConversationId(
  conversationId: string
): Promise<TestimonialOfferResult> {
  const trimmed = conversationId.trim();
  if (!trimmed) return { status: "ineligible" };

  const response = await db.response.findUnique({
    where: { conversationId: trimmed },
    select: {
      id: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
      surveyInvite: { select: { id: true } },
    },
  });

  if (!response) return { status: "pending" };
  if (!isCompleteSurveyResponse(response)) return { status: "ineligible" };

  const ask = await offerTestimonialForResponse({
    responseId: response.id,
    surveyInviteId: response.surveyInvite?.id,
  });
  if (!ask) return { status: "ineligible" };
  return { status: "ready", ask };
}

export async function resolveInviteIdForToken(inviteToken: string | null | undefined) {
  const token = inviteToken?.trim();
  if (!token) return null;
  const invite = await db.surveyInvite.findUnique({
    where: { token },
    select: { id: true },
  });
  return invite?.id ?? null;
}
