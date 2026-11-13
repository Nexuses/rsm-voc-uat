import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  SURVEY_QUESTIONS,
  SURVEY_VERSION,
} from "@/lib/survey/constants";
import {
  combineClientName,
  type NormalizedSurveyInput,
} from "@/lib/survey/schema";

export const elevenLabsPayloadSchema = z
  .object({
    type: z.literal("post_call_transcription"),
    event_timestamp: z.number().optional(),
    data: z
      .object({
        conversation_id: z.string().min(1),
        metadata: z
          .object({
            start_time_unix_secs: z.number().optional(),
            call_duration_secs: z.number().nonnegative().optional(),
            start_time: z.string().optional(),
            end_time: z.string().optional(),
          })
          .passthrough()
          .optional(),
        analysis: z
          .object({
            data_collection_results: z
              .record(z.string(), z.unknown())
              .optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

type ElevenLabsPayload = z.infer<typeof elevenLabsPayloadSchema>;
type DataCollection = Record<string, unknown>;

export function normalizeElevenLabsPayload(
  unknownPayload: unknown
): NormalizedSurveyInput {
  const payload = elevenLabsPayloadSchema.parse(unknownPayload);
  const dataCollection =
    payload.data.analysis?.data_collection_results ?? {};
  const answers: NormalizedSurveyInput["answers"] = [];

  for (const definition of SURVEY_QUESTIONS) {
    const questionNumber = definition.questionNumber;
    const rawRating = readDataCollection(
      dataCollection,
      `q${questionNumber}_rating`
    );
    if (rawRating === undefined || rawRating === null || rawRating === "") {
      continue;
    }

    const rating = Number(rawRating);
    if (
      !Number.isInteger(rating) ||
      rating < definition.min ||
      rating > definition.max
    ) {
      throw new Error(
        `q${questionNumber}_rating must be an integer from ${definition.min} to ${definition.max}`
      );
    }

    const rawReason = readDataCollection(
      dataCollection,
      `q${questionNumber}_reason`
    );
    answers.push({
      question_number: questionNumber,
      question_text: definition.question,
      metric: definition.metric,
      scale_min: definition.min,
      scale_max: definition.max,
      rating,
      reason_text:
        typeof rawReason === "string" && rawReason.trim()
          ? rawReason.trim()
          : undefined,
      reason_method: "spoken",
    });
  }

  const firstName = readString(dataCollection, "client_first_name");
  const lastName = readString(dataCollection, "client_last_name");
  const clientName =
    readString(dataCollection, "client_name") ??
    combineClientName(firstName, lastName);
  const startedAt = parseStartTime(payload.data.metadata);

  return {
    source: "elevenlabs",
    conversationId: payload.data.conversation_id,
    surveyVersion: SURVEY_VERSION,
    clientName,
    company: readString(dataCollection, "client_company"),
    designation: readString(dataCollection, "client_designation"),
    language: readString(dataCollection, "language") ?? "en",
    answers,
    rawPayload: payload as unknown as Prisma.InputJsonValue,
    startedAt,
    completedAt: parseCompletionTime(
      payload.data.metadata,
      startedAt,
      payload.event_timestamp
    ),
  };
}

function readDataCollection(
  dataCollection: DataCollection,
  key: string
) {
  const entry = dataCollection[key];
  if (entry !== null && typeof entry === "object" && "value" in entry) {
    return entry.value;
  }
  return entry;
}

function readString(dataCollection: DataCollection, key: string) {
  const value = readDataCollection(dataCollection, key);
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}

function parseStartTime(
  metadata: ElevenLabsPayload["data"]["metadata"]
) {
  if (metadata?.start_time_unix_secs !== undefined) {
    return new Date(metadata.start_time_unix_secs * 1000);
  }
  return parseDate(metadata?.start_time);
}

function parseCompletionTime(
  metadata: ElevenLabsPayload["data"]["metadata"],
  startedAt: Date | undefined,
  eventTimestamp: number | undefined
) {
  const explicitEnd = parseDate(metadata?.end_time);
  if (explicitEnd) return explicitEnd;

  if (startedAt && metadata?.call_duration_secs !== undefined) {
    return new Date(
      startedAt.getTime() + metadata.call_duration_secs * 1000
    );
  }

  return eventTimestamp === undefined
    ? undefined
    : new Date(eventTimestamp * 1000);
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
