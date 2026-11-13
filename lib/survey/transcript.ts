import { SURVEY_QUESTIONS } from "@/lib/survey/constants";
import { formatVoiceTranscriptMessage } from "@/lib/survey/voice-transcript";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+|00)?\d[\d\s().-]{7,}\d/g;

export type SurveyTranscriptAnswer = {
  metric: "csat" | "ces" | "nps";
  question: string;
  score: number | null;
  comment: string | null;
};

export type SurveyTranscriptTurn = {
  role: "agent" | "user";
  message: string;
};

export type SurveyTranscriptView = {
  answers: SurveyTranscriptAnswer[];
  turns: SurveyTranscriptTurn[];
};

type StoredAnswer = {
  question_number?: number;
  reason_text?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function redactContactText(text: string) {
  return text
    .replace(EMAIL_PATTERN, "[redacted]")
    .replace(PHONE_PATTERN, "[redacted]")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function commentForMetric(
  answers: StoredAnswer[],
  questionNumber: number
) {
  const row = answers.find((item) => item.question_number === questionNumber);
  const text = row?.reason_text?.trim();
  return text ? redactContactText(text) : null;
}

export function voiceTurnsFromRawPayload(rawPayload: unknown): SurveyTranscriptTurn[] {
  const root = asRecord(rawPayload);
  const data = asRecord(root?.data) ?? root;
  const transcript = data?.transcript;
  if (!Array.isArray(transcript)) return [];

  const turns: SurveyTranscriptTurn[] = [];
  for (const item of transcript) {
    const row = asRecord(item);
    if (!row) continue;
    if (row.role !== "agent" && row.role !== "user") continue;
    if (typeof row.message !== "string") continue;
    const message = redactContactText(formatVoiceTranscriptMessage(row.message));
    if (!message) continue;
    turns.push({ role: row.role, message });
  }
  return turns;
}

export function buildSurveyTranscriptView(input: {
  csatScore: number | null;
  cesScore: number | null;
  npsScore: number | null;
  answers: unknown;
  rawPayload?: unknown;
}): SurveyTranscriptView {
  const stored = Array.isArray(input.answers)
    ? (input.answers as StoredAnswer[])
    : [];
  const scores = {
    csat: input.csatScore,
    ces: input.cesScore,
    nps: input.npsScore,
  };

  return {
    answers: SURVEY_QUESTIONS.map((definition) => ({
      metric: definition.metric,
      question: definition.question,
      score: scores[definition.metric],
      comment: commentForMetric(stored, definition.questionNumber),
    })),
    turns: voiceTurnsFromRawPayload(input.rawPayload),
  };
}
