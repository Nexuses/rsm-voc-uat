type StoredAnswer = {
  question_number?: number;
  metric?: string | null;
  rating?: number | null;
  reason_text?: string | null;
};

const METRIC_BY_QUESTION_NUMBER: Record<number, string> = { 1: "csat", 2: "ces", 3: "nps" };

export type AnswerRow = {
  questionKey: string;
  metric: string | null;
  numericValue: number | null;
  textValue: string | null;
};

/** Normalizes Response.answers JSON into one row per question. */
export function toAnswerRows(answers: unknown): AnswerRow[] {
  if (!Array.isArray(answers)) return [];
  const rows = new Map<string, AnswerRow>();
  for (const raw of answers as StoredAnswer[]) {
    if (!raw || typeof raw !== "object") continue;
    const metric =
      raw.metric ??
      (raw.question_number ? METRIC_BY_QUESTION_NUMBER[raw.question_number] : undefined) ??
      null;
    const questionKey = metric ?? (raw.question_number ? `q${raw.question_number}` : null);
    if (!questionKey || rows.has(questionKey)) continue;
    const numeric =
      typeof raw.rating === "number" && Number.isFinite(raw.rating) ? raw.rating : null;
    const text = typeof raw.reason_text === "string" && raw.reason_text.trim()
      ? raw.reason_text.trim()
      : null;
    rows.set(questionKey, { questionKey, metric, numericValue: numeric, textValue: text });
  }
  return [...rows.values()];
}
