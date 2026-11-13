import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  isCxAuthError: vi.fn((error: unknown) => error instanceof MockAuthError),
  isCxPermissionError: vi.fn((error: unknown) => error instanceof MockPermissionError),
  isSmtpConfigured: vi.fn(),
  createAndSendSurveyInvite: vi.fn(),
  createAndSendSurveyInvites: vi.fn(),
  parseRecipientsFromCsv: vi.fn(),
}));

class MockAuthError extends Error {}
class MockPermissionError extends Error {}

vi.mock("@/lib/auth", () => ({
  requirePermission: mocks.requirePermission,
  isCxAuthError: mocks.isCxAuthError,
  isCxPermissionError: mocks.isCxPermissionError,
}));

vi.mock("@/lib/survey-invite-email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/survey-invite-email")>();
  return {
    ...actual,
    isSmtpConfigured: mocks.isSmtpConfigured,
  };
});

vi.mock("@/lib/survey-invite-tracking", () => ({
  createAndSendSurveyInvite: mocks.createAndSendSurveyInvite,
  createAndSendSurveyInvites: mocks.createAndSendSurveyInvites,
  parseRecipientsFromCsv: mocks.parseRecipientsFromCsv,
  buildTrackedSurveyUrl: (token: string) =>
    `https://rsm-voc-platform.vercel.app/survey?invite=${token}`,
}));

vi.mock("@/lib/survey/request-security", () => ({
  keyDigest: (value: string) => `digest:${value}`,
  consumeRateLimitForDigest: vi.fn(async () => ({
    allowed: true,
    count: 1,
    limit: 1000,
    retryAfterSeconds: 1,
  })),
}));

import { POST } from "@/app/api/survey/invite/route";

function inviteRequest(body: unknown) {
  return new NextRequest("https://rsm-voc-platform.vercel.app/api/survey/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/survey/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({ user: { id: "cx-1" } });
    mocks.isSmtpConfigured.mockReturnValue(true);
    mocks.createAndSendSurveyInvite.mockResolvedValue({
      invite: {
        id: "invite-1",
        token: "invite-token",
        resultToken: "result-token",
        externalEngagementId: null,
        triggerStage: null,
        email: "client@example.com",
      },
      reused: false,
    });
    mocks.createAndSendSurveyInvites.mockResolvedValue({
      batchId: "batch-1",
      sent: 2,
      results: [
        { email: "a@example.com", ok: true },
        { email: "b@example.com", ok: true },
      ],
    });
    mocks.parseRecipientsFromCsv.mockReturnValue([
      { email: "a@example.com", firstName: "Client", lastName: "One" },
      { email: "b@example.com", firstName: "Client", lastName: "Two" },
    ]);
  });

  it("requires CX authentication", async () => {
    mocks.requirePermission.mockRejectedValue(new MockAuthError());

    const response = await POST(inviteRequest({}));
    expect(response.status).toBe(401);
  });

  it("rejects when SMTP is not configured", async () => {
    mocks.isSmtpConfigured.mockReturnValue(false);

    const response = await POST(
      inviteRequest({
        to: "client@example.com",
        subject: "Survey",
      })
    );

    expect(response.status).toBe(503);
    expect(mocks.createAndSendSurveyInvite).not.toHaveBeenCalled();
  });

  it("validates the invite payload", async () => {
    const response = await POST(
      inviteRequest({
        to: "not-an-email",
        subject: "",
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createAndSendSurveyInvite).not.toHaveBeenCalled();
  });

  it("sends a single tracked survey invitation", async () => {
    const payload = {
      to: "client@example.com",
      subject: "RSM survey",
    };

    const response = await POST(inviteRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      sent: 1,
      failed: 0,
      total: 1,
    });
    expect(mocks.createAndSendSurveyInvite).toHaveBeenCalledWith({
      email: "client@example.com",
      subject: "RSM survey",
      recipient: expect.objectContaining({ email: "client@example.com" }),
      actorUserId: "cx-1",
      actorType: "user",
    });
    expect(mocks.createAndSendSurveyInvites).not.toHaveBeenCalled();
  });

  it("rejects payloads that combine single and CSV recipients", async () => {
    const response = await POST(
      inviteRequest({
        to: "client@example.com",
        csv: "email\na@example.com",
        subject: "RSM survey",
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createAndSendSurveyInvite).not.toHaveBeenCalled();
    expect(mocks.createAndSendSurveyInvites).not.toHaveBeenCalled();
  });

  it("sends bulk invitations from CSV", async () => {
    const response = await POST(
      inviteRequest({
        csv: "email,firstname,lastname\na@example.com,Client,One\nb@example.com,Client,Two",
        subject: "Bulk survey",
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.createAndSendSurveyInvites).toHaveBeenCalled();
  });
});
