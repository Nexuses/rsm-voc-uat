import OpenAI from "openai";
import { INSIGHT_MODEL } from "@/lib/insight";

export type AiMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; toolCalls?: AiToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

export type AiToolCall = { id: string; name: string; arguments: string };

export type AiToolDefinition = {
  name: string;
  description: string;
  /** JSON schema for the arguments object. */
  parameters: Record<string, unknown>;
};

export type AiChatResult = {
  content: string | null;
  toolCalls: AiToolCall[];
  usage: { inputTokens: number | null; outputTokens: number | null };
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  chat(input: {
    messages: AiMessage[];
    tools?: AiToolDefinition[];
    json?: boolean;
  }): Promise<AiChatResult>;
}

export const AI_TIMEOUT_MS = 60_000;

export class AiNotConfiguredError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not configured");
  }
}

function toOpenAiMessage(message: AiMessage): OpenAI.Chat.ChatCompletionMessageParam {
  if (message.role === "tool") {
    return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
  }
  if (message.role === "assistant") {
    return {
      role: "assistant",
      content: message.content,
      ...(message.toolCalls?.length
        ? {
            tool_calls: message.toolCalls.map((call) => ({
              id: call.id,
              type: "function" as const,
              function: { name: call.name, arguments: call.arguments },
            })),
          }
        : {}),
    };
  }
  return { role: message.role, content: message.content };
}

let client: OpenAI | undefined;

export const openAiProvider: AiProvider = {
  name: "openai",
  model: INSIGHT_MODEL,
  async chat(input) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new AiNotConfiguredError();
    client ??= new OpenAI({ apiKey, timeout: AI_TIMEOUT_MS, maxRetries: 1 });
    const completion = await client.chat.completions.create({
      model: INSIGHT_MODEL,
      messages: input.messages.map(toOpenAiMessage),
      ...(input.tools?.length
        ? {
            tools: input.tools.map((tool) => ({
              type: "function" as const,
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              },
            })),
          }
        : {}),
      ...(input.json ? { response_format: { type: "json_object" as const } } : {}),
    });
    const message = completion.choices[0]?.message;
    return {
      content: message?.content ?? null,
      toolCalls: (message?.tool_calls ?? []).flatMap((call) =>
        call.type === "function"
          ? [{ id: call.id, name: call.function.name, arguments: call.function.arguments }]
          : []
      ),
      usage: {
        inputTokens: completion.usage?.prompt_tokens ?? null,
        outputTokens: completion.usage?.completion_tokens ?? null,
      },
    };
  },
};

let override: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  return override ?? openAiProvider;
}

/** Test seam; production code never calls this. */
export function setAiProviderForTests(provider: AiProvider | null) {
  override = provider;
}
