// lib/insight.ts — OpenAI insight generation (JSON mode) + embedding for RAG.
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INSIGHT_MODEL = "gpt-4o";           // benchmark vs alternatives before committing
const EMBED_MODEL = "text-embedding-3-small";

export type Answer = {
  question_number: number;
  question_text?: string;
  rating: number;
  reason_text?: string;
  reason_method?: "spoken" | "typed" | "both";
};

export type Insight = {
  overallSentiment: "positive" | "neutral" | "negative";
  satisfactionSummary: string;
  keyDrivers: string[];
  riskSignals: string[];
  suggestedReply: { en: string; ar: string };
  nextSteps: string[];
};

const SYSTEM = `You analyse a single client's satisfaction survey for RSM in Kuwait, an audit/advisory firm.
Return ONLY valid JSON matching this exact shape, no prose:
{
  "overallSentiment": "positive" | "neutral" | "negative",
  "satisfactionSummary": string,   // 1-2 sentences: why this client feels how they do
  "keyDrivers": string[],          // concrete drivers, e.g. "slow turnaround on filing"
  "riskSignals": string[],         // e.g. "churn risk", "escalation", or [] if none
  "suggestedReply": { "en": string, "ar": string }, // a short reply a partner could send
  "nextSteps": string[]            // concrete actions, e.g. "partner to call within 48h"
}
Be specific and grounded in the client's own words. Never invent facts about RSM.`;

export async function generateInsight(answers: Answer[], language: string): Promise<Insight> {
  const userContent = JSON.stringify({ language, answers });

  const completion = await openai.chat.completions.create({
    model: INSIGHT_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userContent },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as Insight;
}

export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({ model: EMBED_MODEL, input: text });
  return res.data[0].embedding;
}

// Build the text we embed for retrieval: the reasons + the insight summary.
export function buildEmbeddingContent(answers: Answer[], insight: Insight): string {
  const reasons = answers
    .filter((a) => a.reason_text)
    .map((a) => `Q${a.question_number} (${a.rating}/5): ${a.reason_text}`)
    .join("\n");
  return `${insight.satisfactionSummary}\nDrivers: ${insight.keyDrivers.join(", ")}\n${reasons}`;
}
