import { z } from "zod";
import { SURVEY_QUESTIONS, SURVEY_VERSION } from "@/lib/survey/constants";
import { VOICE_LOCALES } from "@/lib/survey/voice-locale";

const localizedText = z.object({
  en: z.string().trim().min(1).max(500),
  ar: z.string().trim().max(500).optional(),
});

const questionSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
    metric: z.enum(["csat", "ces", "nps"]).optional(),
    kind: z.enum(["rating", "text", "choice"]),
    scale: z.object({ min: z.number().int(), max: z.number().int() }).optional(),
    text: localizedText,
    weight: z.number().min(0).max(100).optional(),
    required: z.boolean().default(true),
    options: z
      .array(z.object({ key: z.string().regex(/^[a-z0-9_]{1,40}$/), label: localizedText }))
      .max(20)
      .optional(),
  })
  .refine((q) => q.kind !== "rating" || (q.scale && q.scale.min < q.scale.max), {
    message: "rating questions need a scale with min below max",
  })
  .refine((q) => q.kind !== "choice" || (q.options && q.options.length >= 2), {
    message: "choice questions need at least two options",
  });

export const surveyDefinitionSchema = z
  .object({
    locales: z.array(z.enum(["en", "ar"])).min(1),
    questions: z.array(questionSchema).min(1).max(30),
  })
  .refine(
    (d) => new Set(d.questions.map((q) => q.key)).size === d.questions.length,
    { message: "question keys must be unique" }
  )
  .refine(
    (d) =>
      !d.locales.includes("ar") ||
      d.questions.every((q) => Boolean(q.text.ar?.trim())),
    { message: "every question needs Arabic text when Arabic is enabled" }
  );

export type SurveyDefinition = z.infer<typeof surveyDefinitionSchema>;
export type SurveyDefinitionQuestion = SurveyDefinition["questions"][number];

export const DEFAULT_SURVEY_KEY = "client-experience";
export const DEFAULT_SURVEY_NAME = "Client Experience (CSAT/CES/NPS)";

/** The live three-metric survey, built from the approved EN/AR copy verbatim. */
export function currentLiveSurveyDefinition(): SurveyDefinition {
  const arabic = VOICE_LOCALES.ar.typed.questions;
  return {
    locales: ["en", "ar"],
    questions: SURVEY_QUESTIONS.map((question) => ({
      key: question.metric,
      metric: question.metric,
      kind: "rating" as const,
      scale: { min: question.min, max: question.max },
      text: {
        en: question.question,
        ar: arabic.find((item) => item.metric === question.metric)?.question,
      },
      required: true,
    })),
  };
}

export const CURRENT_LIVE_VERSION_KEY = SURVEY_VERSION;
