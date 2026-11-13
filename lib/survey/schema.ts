import type { Prisma } from "@prisma/client";
import { z } from "zod";
import type { Answer } from "@/lib/insight";
import { SURVEY_VERSION } from "@/lib/survey/constants";

export const typedSurveySchema = z.object({
  submissionId: z.string().uuid(),
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(160),
  company: z.string().trim().min(1).max(160),
  designation: z.string().trim().min(1).max(160),
  csatRating: z.coerce.number().int().min(1).max(5),
  csatComment: z.string().trim().max(2000).default(""),
  cesRating: z.coerce.number().int().min(1).max(7),
  cesComment: z.string().trim().max(2000).default(""),
  npsRating: z.coerce.number().int().min(0).max(10),
  npsComment: z.string().trim().max(2000).default(""),
  website: z.literal("").default(""),
  inviteToken: z.string().trim().min(8).max(128).optional(),
  language: z.enum(["en", "ar"]).default("en"),
});

export type TypedSurvey = z.infer<typeof typedSurveySchema>;
export type SurveySource = "elevenlabs" | "typed";

export type NormalizedSurveyInput = {
  source: SurveySource;
  conversationId: string;
  clientName?: string;
  email?: string;
  company?: string;
  designation?: string;
  surveyVersion: string;
  language: string;
  answers: Answer[];
  rawPayload: Prisma.InputJsonValue;
  startedAt?: Date;
  completedAt?: Date;
  inviteToken?: string;
};

export function combineClientName(firstName?: string, lastName?: string) {
  const name = [firstName?.trim(), lastName?.trim()]
    .filter(Boolean)
    .join(" ");
  return name || undefined;
}

export function currentSurveyVersion() {
  return SURVEY_VERSION;
}
