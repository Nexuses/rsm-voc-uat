import { randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getSurveyPublicOrigin } from "@/lib/app-base-url";
import { db } from "@/lib/db";
import {
  isTestimonialEligible,
  sourceCommentsFromAnswers,
  testimonialKindForComments,
  type TestimonialKind,
  type TestimonialScores,
} from "@/lib/testimonials/eligibility";

export type ThankYouTestimonialAsk = {
  id: string;
  kind: TestimonialKind;
  url: string;
};

function testimonialUrl(token: string) {
  return `${getSurveyPublicOrigin()}/testimonial/${token}`;
}

function newToken() {
  return randomBytes(24).toString("base64url");
}

function isUniqueConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export async function prepareThankYouTestimonial(input: {
  responseId: string;
  /** Optional — walk-in (no invite) completions may still get a page offer. */
  surveyInviteId?: string | null;
  scores: TestimonialScores;
  answers: unknown;
}): Promise<ThankYouTestimonialAsk | null> {
  if (!isTestimonialEligible(input.scores)) return null;

  const sourceComments = sourceCommentsFromAnswers(input.answers);
  const kind = testimonialKindForComments(sourceComments);
  const surveyInviteId = input.surveyInviteId?.trim() || null;

  const existing = await db.testimonial.findUnique({
    where: { responseId: input.responseId },
    select: { id: true, token: true, kind: true, surveyInviteId: true },
  });
  if (existing) {
    if (surveyInviteId && !existing.surveyInviteId) {
      await db.testimonial.updateMany({
        where: { id: existing.id, surveyInviteId: null },
        data: { surveyInviteId },
      });
    }
    return {
      id: existing.id,
      kind: existing.kind === "original_request" ? "original_request" : "draft_approval",
      url: testimonialUrl(existing.token),
    };
  }

  try {
    const created = await db.testimonial.create({
      data: {
        id: randomUUID(),
        responseId: input.responseId,
        surveyInviteId,
        token: newToken(),
        source: "survey_thankyou",
        kind,
        status: "requested",
        sourceComments,
      },
      select: { id: true, token: true, kind: true },
    });
    return {
      id: created.id,
      kind: created.kind === "original_request" ? "original_request" : "draft_approval",
      url: testimonialUrl(created.token),
    };
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const raced = await db.testimonial.findUnique({
      where: { responseId: input.responseId },
      select: { id: true, token: true, kind: true },
    });
    if (!raced) throw error;
    return {
      id: raced.id,
      kind: raced.kind === "original_request" ? "original_request" : "draft_approval",
      url: testimonialUrl(raced.token),
    };
  }
}

export async function markTestimonialRequested(id: string) {
  await db.testimonial.updateMany({
    where: { id, status: "requested", requestedAt: null },
    data: { requestedAt: new Date() },
  });
}
