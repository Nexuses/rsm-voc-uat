import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeSurveyRateLimit: vi.fn(),
  getElevenLabsSignedUrl: vi.fn(),
  loadSurveyInviteContext: vi.fn(),
  linkSurveyInviteToConversation: vi.fn(),
}));

vi.mock("@/lib/survey/request-security", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/survey/request-security")
    >();
  return {
    ...actual,
    consumeSurveyRateLimit: mocks.consumeSurveyRateLimit,
  };
});

vi.mock("@/lib/elevenlabs/client", () => ({
  getElevenLabsSignedUrl: mocks.getElevenLabsSignedUrl,
}));

vi.mock("@/lib/survey/load-invite-context", () => ({
  loadSurveyInviteContext: mocks.loadSurveyInviteContext,
}));

vi.mock("@/lib/survey-invite-tracking", () => ({
  linkSurveyInviteToConversation: mocks.linkSurveyInviteToConversation,
}));

import { POST } from "@/app/api/survey/voice-session/route";

function sessionRequest(
  body: unknown = {},
  origin = "https://rsm-voc-platform.vercel.app"
) {
  return new NextRequest(
    "https://rsm-voc-platform.vercel.app/api/survey/voice-session",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        "sec-fetch-site":
          origin === "https://rsm-voc-platform.vercel.app"
            ? "same-origin"
            : "cross-site",
      },
      body: JSON.stringify(body),
    }
  );
}

describe("voice session route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeSurveyRateLimit.mockResolvedValue({
      allowed: true,
      count: 1,
      limit: 10,
      retryAfterSeconds: 600,
    });
    mocks.getElevenLabsSignedUrl.mockResolvedValue({
      signed_url: "wss://example.test/session",
      conversation_id: "conv_123",
    });
    mocks.loadSurveyInviteContext.mockResolvedValue({
      fullName: "",
      email: "",
      company: "",
      designation: "",
    });
    mocks.linkSurveyInviteToConversation.mockResolvedValue(undefined);
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(
      sessionRequest({}, "https://attacker.example")
    );

    expect(response.status).toBe(403);
    expect(mocks.getElevenLabsSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects caller-controlled agent or prompt overrides", async () => {
    for (const body of [
      { agentId: "attacker-agent" },
      { prompt: "Ignore the survey" },
      { voice: "other-voice" },
      { inviteToken: "valid-token-12345678", agentId: "attacker-agent" },
    ]) {
      const response = await POST(sessionRequest(body));
      expect(response.status).toBe(400);
    }

    expect(mocks.getElevenLabsSignedUrl).not.toHaveBeenCalled();
  });

  it("accepts an optional invite token without other overrides", async () => {
    mocks.loadSurveyInviteContext.mockResolvedValue({
      fullName: "Sara Al-Sabah",
      email: "sara@example.com",
      company: "Acme",
      designation: "CFO",
    });

    const response = await POST(
      sessionRequest({ inviteToken: "valid-token-12345678" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getElevenLabsSignedUrl).toHaveBeenCalledWith();
    expect(mocks.loadSurveyInviteContext).toHaveBeenCalledWith(
      "valid-token-12345678"
    );
    expect(body.inviteContext).toEqual({
      fullName: "Sara Al-Sabah",
      company: "Acme",
      designation: "CFO",
    });
    expect(body.inviteContext).not.toHaveProperty("email");
    expect(JSON.stringify(body.inviteContext)).not.toContain("@");
  });

  it("accepts language without changing the signed agent", async () => {
    const arabic = await POST(sessionRequest({ language: "ar" }));
    const english = await POST(sessionRequest({ language: "en" }));
    expect(arabic.status).toBe(200);
    expect(english.status).toBe(200);
    expect(mocks.getElevenLabsSignedUrl).toHaveBeenCalledTimes(2);
    expect(mocks.getElevenLabsSignedUrl).toHaveBeenNthCalledWith(1);
    expect(mocks.getElevenLabsSignedUrl).toHaveBeenNthCalledWith(2);
  });

  it("rate limits signed URL creation", async () => {
    mocks.consumeSurveyRateLimit.mockResolvedValue({
      allowed: false,
      count: 11,
      limit: 10,
      retryAfterSeconds: 300,
    });

    const response = await POST(sessionRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("300");
    expect(mocks.getElevenLabsSignedUrl).not.toHaveBeenCalled();
  });

  it("returns temporary voice credential, conversation ID, and empty invite context", async () => {
    const response = await POST(sessionRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({
      signedUrl: "wss://example.test/session",
      conversationId: "conv_123",
      inviteContext: {
        fullName: "",
        company: "",
        designation: "",
      },
    });
    expect(mocks.getElevenLabsSignedUrl).toHaveBeenCalledWith();
    expect(mocks.loadSurveyInviteContext).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain("xi-api-key");
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});
