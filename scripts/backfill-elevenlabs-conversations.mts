import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import nextEnv from "@next/env";
import { db } from "../lib/db";
import { normalizeElevenLabsPayload } from "../lib/elevenlabs/payload";
import { ingestSurveyResponse } from "../lib/survey/ingest";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const apiKey = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.ELEVENLABS_AGENT_ID;
if (!apiKey || !agentId) {
  throw new Error(
    "ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are required"
  );
}

const client = new ElevenLabsClient({ apiKey });
const page = await client.conversationalAi.conversations.list({
  agentId,
  pageSize: 100,
  excludeStatuses: ["initiated", "in-progress", "processing"],
});

let imported = 0;
let existing = 0;
let incomplete = 0;
let failed = 0;

for (const conversation of page.conversations) {
  const alreadyStored = await db.response.findUnique({
    where: { conversationId: conversation.conversationId },
    select: { id: true },
  });
  if (alreadyStored) {
    existing += 1;
    continue;
  }

  try {
    const detail = await fetchConversation(
      conversation.conversationId,
      apiKey
    );
    const normalized = normalizeElevenLabsPayload({
      type: "post_call_transcription",
      event_timestamp:
        detail.metadata?.start_time_unix_secs !== undefined
          ? detail.metadata.start_time_unix_secs +
            (detail.metadata.call_duration_secs ?? 0)
          : undefined,
      data: detail,
    });

    if (normalized.answers.length === 0) {
      incomplete += 1;
      console.log(
        `SKIP ${conversation.conversationId}: no valid survey rating`
      );
      continue;
    }

    await ingestSurveyResponse(normalized);
    imported += 1;
    console.log(
      `IMPORTED ${conversation.conversationId}: ${normalized.clientName ?? "unknown client"}`
    );
  } catch (error) {
    failed += 1;
    console.error(`FAILED ${conversation.conversationId}:`, error);
  }
}

await db.$disconnect();

console.log(`Imported: ${imported}`);
console.log(`Already stored: ${existing}`);
console.log(`Incomplete: ${incomplete}`);
console.log(`Failed: ${failed}`);

if (failed > 0) process.exitCode = 1;

type ConversationDetail = {
  metadata?: {
    start_time_unix_secs?: number;
    call_duration_secs?: number;
  };
  [key: string]: unknown;
};

async function fetchConversation(
  conversationId: string,
  key: string
): Promise<ConversationDetail> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}`,
    { headers: { "xi-api-key": key } }
  );
  if (!response.ok) {
    throw new Error(
      `ElevenLabs conversation request returned ${response.status}`
    );
  }
  return (await response.json()) as ConversationDetail;
}
