import { db } from "@/lib/db";
import { draftTestimonialFromComments } from "@/lib/testimonials/draft";
import type { SurveyVoiceLanguage } from "@/lib/survey/voice-locale";

const LOCKED_STATUSES = new Set(["published", "archived"]);

export function isTestimonialLocked(status: string) {
  return LOCKED_STATUSES.has(status);
}

function displayName(input: {
  customerName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  clientName?: string | null;
}) {
  const named = input.customerName?.trim();
  if (named) return named;
  const parts = [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return input.clientName?.trim() || null;
}

export async function loadTestimonialReview(token: string) {
  const row = await db.testimonial.findUnique({
    where: { token },
    include: {
      surveyInvite: {
        select: {
          customerName: true,
          firstName: true,
          lastName: true,
          company: true,
        },
      },
      response: {
        select: {
          language: true,
          client: { select: { name: true, company: true } },
        },
      },
    },
  });
  if (!row) return null;

  let aiDraft = row.aiDraft;
  const canDraft =
    row.kind === "draft_approval" &&
    !aiDraft &&
    !row.clientText &&
    row.sourceComments.trim().length > 0;

  if (canDraft) {
    const drafted = await draftTestimonialFromComments(row.sourceComments, row.responseId);
    if (drafted) {
      const saved = await db.testimonial.updateMany({
        where: { id: row.id, aiDraft: null, clientText: null },
        data: { aiDraft: drafted },
      });
      if (saved.count > 0) {
        aiDraft = drafted;
      } else {
        const fresh = await db.testimonial.findUnique({
          where: { id: row.id },
          select: { aiDraft: true },
        });
        aiDraft = fresh?.aiDraft ?? aiDraft;
      }
    }
  }

  const startingText = (row.clientText || aiDraft || (row.kind === "draft_approval" ? row.sourceComments : "")).trim();

  return {
    token: row.token,
    kind: row.kind === "original_request" ? ("original_request" as const) : ("draft_approval" as const),
    status: row.status,
    locked: isTestimonialLocked(row.status),
    /** Language the respondent used for the survey; the review page defaults to it. */
    language: (row.response.language === "ar" ? "ar" : "en") as SurveyVoiceLanguage,
    greetingName: displayName({
      customerName: row.surveyInvite?.customerName,
      firstName: row.surveyInvite?.firstName,
      lastName: row.surveyInvite?.lastName,
      clientName: row.response.client?.name,
    }),
    company: row.surveyInvite?.company?.trim() || row.response.client?.company?.trim() || null,
    initialText: startingText,
    videoUrl: row.videoUrl ?? "",
    consentName: row.consentName,
    consentWebsite: row.consentWebsite === true,
    consentSocial: row.consentSocial === true,
  };
}
