import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

export type AiInteractionInput = {
  purpose: string;
  provider: string;
  model: string;
  promptVersion: string;
  actorUserId: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs: number;
  status: "ok" | "error";
  error?: string | null;
  sourceIds?: string[];
  toolCalls?: string[];
  correlationId?: string | null;
};

/** Metadata only — prompt and completion bodies are never persisted. */
export async function logAiInteraction(input: AiInteractionInput) {
  try {
    await db.aiInteraction.create({
      data: {
        id: randomUUID(),
        purpose: input.purpose,
        provider: input.provider,
        model: input.model,
        promptVersion: input.promptVersion,
        actorType: input.actorUserId ? "user" : "system",
        actorUserId: input.actorUserId,
        inputTokens: input.inputTokens ?? null,
        outputTokens: input.outputTokens ?? null,
        latencyMs: Math.round(input.latencyMs),
        status: input.status,
        error: input.error?.slice(0, 500) ?? null,
        sourceIds: (input.sourceIds ?? []).slice(0, 200),
        toolCalls: (input.toolCalls ?? []).slice(0, 50),
        correlationId: input.correlationId ?? null,
      },
    });
  } catch (error) {
    console.error("AI interaction log failed", error);
  }
}
