import type { TestimonialKind } from "@/lib/testimonials/eligibility";

/** Payload the thank-you panel receives when a survey finishes. */
export type SurveyCompleteResult = {
  /** ElevenLabs or typed conversation id — used to poll for a voice offer. */
  conversationId?: string | null;
  /** Ready immediately after typed ingest when overall Positive. */
  testimonial?: {
    kind: TestimonialKind;
    url: string;
  } | null;
};
