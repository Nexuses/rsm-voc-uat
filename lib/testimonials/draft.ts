import { z } from "zod";
import { logAiInteraction } from "@/lib/ai/log";
import { getAiProvider } from "@/lib/ai/provider";

export const TESTIMONIAL_DRAFT_PROMPT_VERSION = "testimonial-draft-v1";

const SYSTEM = `You turn a client's own survey comments into a short testimonial for RSM in Kuwait.
Rules:
- Use only facts and wording grounded in the comments. Do not add praise, scores, names, companies, or claims that are not in the comments.
- Keep the language of the comments. Do not translate.
- Write 2 to 4 sentences. No title, no quotation marks around the whole text, and no sign-off.
Return only JSON: {"testimonial":"..."}`;

const draftSchema = z.object({
  testimonial: z.string().trim().min(1).max(800),
});

export function parseTestimonialDraft(content: string | null | undefined) {
  try {
    const parsed = draftSchema.safeParse(JSON.parse(content ?? ""));
    if (!parsed.success) return null;
    const text = parsed.data.testimonial.replace(/\s+/g, " ").trim();
    return text || null;
  } catch {
    return null;
  }
}

/** Returns null when the model is unavailable or the draft is unusable. */
export async function draftTestimonialFromComments(
  comments: string,
  responseId: string
) {
  const source = comments.trim().slice(0, 4000);
  if (!source) return null;

  const provider = getAiProvider();
  const started = Date.now();
  try {
    const result = await provider.chat({
      json: true,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: source },
      ],
    });
    const draft = parseTestimonialDraft(result.content);
    await logAiInteraction({
      purpose: "testimonial_draft",
      provider: provider.name,
      model: provider.model,
      promptVersion: TESTIMONIAL_DRAFT_PROMPT_VERSION,
      actorUserId: null,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: Date.now() - started,
      status: draft ? "ok" : "error",
      error: draft ? null : "empty_or_invalid_draft",
      sourceIds: [responseId],
    });
    return draft;
  } catch (error) {
    await logAiInteraction({
      purpose: "testimonial_draft",
      provider: provider.name,
      model: provider.model,
      promptVersion: TESTIMONIAL_DRAFT_PROMPT_VERSION,
      actorUserId: null,
      latencyMs: Date.now() - started,
      status: "error",
      error: error instanceof Error ? error.message : "draft_failed",
      sourceIds: [responseId],
    });
    return null;
  }
}
