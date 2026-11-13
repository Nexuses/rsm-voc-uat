import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeSurveyRateLimit: vi.fn(),
  loadSurveyInviteContext: vi.fn(),
}));

vi.mock("@/lib/survey/request-security", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/survey/request-security")>();
  return {
    ...actual,
    consumeSurveyRateLimit: mocks.consumeSurveyRateLimit,
  };
});

vi.mock("@/lib/survey/load-invite-context", () => ({
  loadSurveyInviteContext: mocks.loadSurveyInviteContext,
}));

import { POST } from "@/app/api/survey/invite-context/route";

function contextRequest(
  body: unknown,
  origin = "https://rsm-voc-platform.vercel.app"
) {
  return new NextRequest(
    "https://rsm-voc-platform.vercel.app/api/survey/invite-context",
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

describe("invite context route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeSurveyRateLimit.mockResolvedValue({
      allowed: true,
      count: 1,
      limit: 60,
      retryAfterSeconds: 600,
    });
    mocks.loadSurveyInviteContext.mockResolvedValue({
      fullName: "Sara Al-Sabah",
      email: "sara@example.com",
      company: "Acme",
      designation: "CFO",
    });
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(
      contextRequest(
        { inviteToken: "valid-token-12345678" },
        "https://attacker.example"
      )
    );
    expect(response.status).toBe(403);
    expect(mocks.loadSurveyInviteContext).not.toHaveBeenCalled();
  });

  it("returns safe invite fields for a valid token", async () => {
    const response = await POST(
      contextRequest({ inviteToken: "valid-token-12345678" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      inviteContext: {
        fullName: "Sara Al-Sabah",
        email: "sara@example.com",
        company: "Acme",
        designation: "CFO",
      },
    });
    expect(JSON.stringify(body)).not.toMatch(/partner|manager|project/i);
  });

  it("returns empty context when the invite is unknown", async () => {
    mocks.loadSurveyInviteContext.mockResolvedValue({
      fullName: "",
      email: "",
      company: "",
      designation: "",
    });

    const response = await POST(
      contextRequest({ inviteToken: "missing-token-12345678" })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      inviteContext: {
        fullName: "",
        email: "",
        company: "",
        designation: "",
      },
    });
  });

  it("rate limits invite context lookups", async () => {
    mocks.consumeSurveyRateLimit.mockResolvedValue({
      allowed: false,
      count: 61,
      limit: 60,
      retryAfterSeconds: 120,
    });

    const response = await POST(
      contextRequest({ inviteToken: "valid-token-12345678" })
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("120");
    expect(mocks.loadSurveyInviteContext).not.toHaveBeenCalled();
  });
});
