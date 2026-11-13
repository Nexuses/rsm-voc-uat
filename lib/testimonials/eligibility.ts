import { overallSurveyResult } from "@/lib/survey/metrics";

export type TestimonialKind = "draft_approval" | "original_request";

export type TestimonialScores = {
  csatScore: number | null | undefined;
  cesScore: number | null | undefined;
  npsScore: number | null | undefined;
};

/** Overall Positive: combined score above 80% of 22 (≥18/22). */
export function isTestimonialEligible(scores: TestimonialScores) {
  return overallSurveyResult(scores) === "Positive";
}

export function sourceCommentsFromAnswers(answers: unknown) {
  if (!Array.isArray(answers)) return "";
  const parts: string[] = [];
  for (const entry of answers) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const reason = (entry as { reason_text?: unknown }).reason_text;
    if (typeof reason !== "string") continue;
    const trimmed = reason.trim();
    if (!trimmed || parts.includes(trimmed)) continue;
    parts.push(trimmed);
  }
  return parts.join("\n\n");
}

export function testimonialKindForComments(sourceComments: string): TestimonialKind {
  return sourceComments.trim() ? "draft_approval" : "original_request";
}
