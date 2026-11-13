import { z } from "zod";

const signedUrlSchema = z.object({
  signed_url: z.string().url(),
  conversation_id: z.string().min(1).optional(),
});

export async function getElevenLabsSignedUrl() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID?.trim();
  if (!apiKey || !agentId) {
    throw new Error("voice session is not configured");
  }

  const url = new URL(
    "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url"
  );
  url.searchParams.set("agent_id", agentId);
  url.searchParams.set("include_conversation_id", "true");

  const response = await fetch(url.toString(), {
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("voice session could not be created");
  }

  const parsed = signedUrlSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("voice session could not be created");
  }
  return parsed.data;
}
