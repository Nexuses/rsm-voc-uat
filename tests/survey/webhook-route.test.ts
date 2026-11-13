import crypto from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ingestSurveyResponseDeferred: vi.fn(),
}));

vi.mock("@/lib/survey/ingest", () => ({
  ingestSurveyResponseDeferred: mocks.ingestSurveyResponseDeferred,
}));

import { POST } from "@/app/api/webhooks/elevenlabs/route";

const secret = "test-webhook-secret";
const validPayload = {
  type: "post_call_transcription",
  data: {
    conversation_id: "conv_test",
    analysis: {
      data_collection_results: {
        client_first_name: { value: "Noor" },
        client_last_name: { value: "Al-Sabah" },
        client_company: { value: "Example Co" },
        language: { value: "en" },
        q1_rating: { value: 5 },
        q1_reason: { value: "Responsive team" },
      },
    },
  },
};

function signedRequest(payload: unknown) {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return new NextRequest(
    "https://rsm-voc-platform.vercel.app/api/webhooks/elevenlabs",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "elevenlabs-signature": `t=${timestamp},v0=${signature}`,
      },
      body,
    }
  );
}

describe("ElevenLabs webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ELEVENLABS_WEBHOOK_SECRET = secret;
    mocks.ingestSurveyResponseDeferred.mockResolvedValue({
      responseId: "response-1",
      created: true,
    });
  });

  it("rejects an invalid normalized payload without ingesting it", async () => {
    const response = await POST(signedRequest({ type: "unknown" }));

    expect(response.status).toBe(400);
    expect(mocks.ingestSurveyResponseDeferred).not.toHaveBeenCalled();
  });

  it("returns a retryable response when ingest fails", async () => {
    mocks.ingestSurveyResponseDeferred.mockRejectedValue(
      new Error("database unavailable")
    );

    const response = await POST(signedRequest(validPayload));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "webhook ingest failed",
    });
    expect(mocks.ingestSurveyResponseDeferred).toHaveBeenCalledOnce();
  });
});
