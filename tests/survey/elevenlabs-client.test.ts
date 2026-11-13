import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getElevenLabsSignedUrl } from "@/lib/elevenlabs/client";

describe("ElevenLabs signed URL client", () => {
  const originalApiKey = process.env.ELEVENLABS_API_KEY;
  const originalAgentId = process.env.ELEVENLABS_AGENT_ID;

  beforeEach(() => {
    process.env.ELEVENLABS_API_KEY = "test-api-key";
    process.env.ELEVENLABS_AGENT_ID =
      "agent_6401ktv5yqkmf2a95qpd3nh62380";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.ELEVENLABS_API_KEY = originalApiKey;
    process.env.ELEVENLABS_AGENT_ID = originalAgentId;
  });

  it("requests a signed URL for the fixed configured agent", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          signed_url: "wss://example.test/session",
          conversation_id: "conv_123",
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getElevenLabsSignedUrl()).resolves.toEqual({
      signed_url: "wss://example.test/session",
      conversation_id: "conv_123",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=agent_6401ktv5yqkmf2a95qpd3nh62380&include_conversation_id=true",
      {
        headers: { "xi-api-key": "test-api-key" },
        cache: "no-store",
      }
    );
  });

  it("uses a generic error for malformed provider responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "provider detail" }), {
          status: 502,
        })
      )
    );

    await expect(getElevenLabsSignedUrl()).rejects.toThrow(
      "voice session could not be created"
    );
  });
});
