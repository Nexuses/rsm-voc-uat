// lib/insight.ts — OpenAI insight generation (JSON mode) + embedding for RAG.
import OpenAI from "openai";
import { z } from "zod";
import type { SurveyMetric } from "@/lib/survey/constants";

export const INSIGHT_MODEL = "gpt-4o";    // benchmark vs alternatives before committing
const EMBED_MODEL = "text-embedding-3-small";
let openai: OpenAI | undefined;

export type Answer = {
  question_number: number;
  question_text?: string;
  metric?: SurveyMetric;
  scale_min?: number;
  scale_max?: number;
  rating: number;
  reason_text?: string;
  reason_method?: "spoken" | "typed" | "both";
};

const insightSchema = z.object({
  overallSentiment: z.enum(["positive", "neutral", "negative"]),
  satisfactionSummary: z.string().min(1),
  keyDrivers: z.array(z.string()),
  riskSignals: z.array(z.string()),
  suggestedReply: z.object({
    en: z.string(),
  }),
  nextSteps: z.array(z.string()),
});

export type Insight = z.infer<typeof insightSchema>;

const SYSTEM = `You analyse a single client's satisfaction survey for RSM in Kuwait, an audit/advisory firm.
Return ONLY valid JSON matching this exact shape, no prose:
{
  "overallSentiment": "positive" | "neutral" | "negative",
  "satisfactionSummary": string,   // 1-2 sentences: why this client feels how they do
  "keyDrivers": string[],          // concrete drivers, e.g. "slow turnaround on filing"
  "riskSignals": string[],         // e.g. "churn risk", "escalation", or [] if none
  "suggestedReply": { "en": string }, // a short English reply a partner could send
  "nextSteps": string[]            // concrete actions, e.g. "partner to call within 48h"
}
Be specific and grounded in the client's own words. Never invent facts about RSM.`;

export async function generateInsight(answers: Answer[], language: string): Promise<Insight> {
  const userContent = JSON.stringify({ language, answers });

  const completion = await getOpenAI().chat.completions.create({
    model: INSIGHT_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userContent },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  return parseInsight(JSON.parse(raw));
}

export async function embedText(text: string): Promise<number[]> {
  const res = await getOpenAI().embeddings.create({ model: EMBED_MODEL, input: text });
  return res.data[0].embedding;
}

export function parseInsight(value: unknown): Insight {
  return insightSchema.parse(value);
}

export function buildEmbeddingContent(
  answers: Answer[],
  insight: Insight,
  identity?: {
    fullName?: string;
    company?: string;
    designation?: string;
  }
): string {
  const identityLine = [
    identity?.fullName ? `Name: ${identity.fullName}` : "",
    identity?.company ? `Company: ${identity.company}` : "",
    identity?.designation ? `Designation: ${identity.designation}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  const metricLines = answers
    .map(
      (a) =>
        `${a.metric?.toUpperCase() ?? `Q${a.question_number}`} (${a.rating}/${a.scale_max ?? 5})${
          a.reason_text ? `: ${a.reason_text}` : ""
        }`
    )
    .join("\n");
  return [
    identityLine,
    insight.satisfactionSummary,
    `Drivers: ${insight.keyDrivers.join(", ")}`,
    metricLines,
  ]
    .filter(Boolean)
    .join("\n");
}

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  // The SDK defaults to a 10-minute timeout with 2 retries, so one stalled
  // call could hold an ingest open far longer than any caller expects.
  openai ??= new OpenAI({ apiKey, timeout: 30_000, maxRetries: 2 });
  return openai;
}
