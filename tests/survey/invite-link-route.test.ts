import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  linkSurveyInviteToConversation: vi.fn(),
}));

vi.mock("@/lib/survey-invite-tracking", () => ({
  linkSurveyInviteToConversation: mocks.linkSurveyInviteToConversation,
}));

vi.mock("@/lib/survey/request-security", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/survey/request-security")>()),
  consumeSurveyRateLimit: vi.fn(async () => ({
    allowed: true,
    count: 1,
    limit: 20,
    retryAfterSeconds: 1,
  })),
}));

import { POST } from "@/app/api/survey/invite-link/route";

function inviteLinkRequest(body: unknown) {
  return new NextRequest("https://rsm-voc-platform.vercel.app/api/survey/invite-link", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://rsm-voc-platform.vercel.app",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/survey/invite-link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.linkSurveyInviteToConversation.mockResolvedValue(true);
  });

  it("links a tracked invite to the live voice conversation", async () => {
    const response = await POST(
      inviteLinkRequest({
        token: "valid-token-12345678",
        conversationId: "conv_live_123",
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.linkSurveyInviteToConversation).toHaveBeenCalledWith(
      "valid-token-12345678",
      "conv_live_123"
    );
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(inviteLinkRequest({ token: "short" }));

    expect(response.status).toBe(400);
    expect(mocks.linkSurveyInviteToConversation).not.toHaveBeenCalled();
  });
});
