import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isSmtpConfigured: vi.fn(),
  consumeIntegrationInviteRateLimit: vi.fn(),
  createAndSendSurveyInvite: vi.fn(),
  createAndSendSurveyInvites: vi.fn(),
  parseRecipientsFromCsv: vi.fn(),
}));

vi.mock("@/lib/survey-invite-email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/survey-invite-email")>();
  return {
    ...actual,
    isSmtpConfigured: mocks.isSmtpConfigured,
  };
});

vi.mock("@/lib/survey/request-security", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/survey/request-security")>();
  return {
    ...actual,
    consumeIntegrationInviteRateLimit: mocks.consumeIntegrationInviteRateLimit,
  };
});

vi.mock("@/lib/survey-invite-tracking", () => ({
  createAndSendSurveyInvite: mocks.createAndSendSurveyInvite,
  createAndSendSurveyInvites: mocks.createAndSendSurveyInvites,
  parseRecipientsFromCsv: mocks.parseRecipientsFromCsv,
  buildTrackedSurveyUrl: (token: string) =>
    `https://rsm-voc-platform.vercel.app/survey?invite=${token}`,
}));

import { POST } from "@/app/api/integrations/survey-invites/route";

function inviteRequest(body: unknown, token = "test-integration-key") {
  return new NextRequest(
    "https://rsm-voc-platform.vercel.app/api/integrations/survey-invites",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  );
}

describe("POST /api/integrations/survey-invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SURVEY_INVITE_API_KEY = "test-integration-key";
    mocks.isSmtpConfigured.mockReturnValue(true);
    mocks.consumeIntegrationInviteRateLimit.mockResolvedValue({
      allowed: true,
      count: 1,
      limit: 100,
      retryAfterSeconds: 60,
    });
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
        { email: "a@example.com", ok: true, inviteId: "invite-a" },
        { email: "b@example.com", ok: true, inviteId: "invite-b" },
      ],
    });
    mocks.parseRecipientsFromCsv.mockReturnValue([
      { email: "a@example.com", firstName: "Client", lastName: "One" },
      { email: "b@example.com", firstName: "Client", lastName: "Two" },
    ]);
  });

  it("requires a bearer API key", async () => {
    const response = await POST(inviteRequest({ to: "client@example.com" }, "wrong"));
    expect(response.status).toBe(401);
    expect(mocks.createAndSendSurveyInvite).not.toHaveBeenCalled();
  });

  it("rejects when the API key is not configured", async () => {
    delete process.env.SURVEY_INVITE_API_KEY;

    const response = await POST(inviteRequest({ to: "client@example.com" }));
    expect(response.status).toBe(401);
  });

  it("rejects non-JSON content types", async () => {
    const response = await POST(
      new NextRequest(
        "https://rsm-voc-platform.vercel.app/api/integrations/survey-invites",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer test-integration-key",
            "Content-Type": "text/plain",
          },
          body: "to=client@example.com",
        }
      )
    );

    expect(response.status).toBe(415);
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
    const response = await POST(
      inviteRequest({
        to: "client@example.com",
        firstName: "Ahmed",
        company: "Acme",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.inviteId).toBe("invite-1");
    expect(body.sent).toBe(1);
    expect(mocks.createAndSendSurveyInvite).toHaveBeenCalledWith({
      email: "client@example.com",
      subject: "RSM in Kuwait — Share your Voice of Clients feedback",
      recipient: expect.objectContaining({
        email: "client@example.com",
        firstName: "Ahmed",
        company: "Acme",
      }),
      actorType: "integration",
    });
  });

  it("passes service, partner, and manager fields through to the invite", async () => {
    const staffFields = {
      department: "Tax",
      serviceName: "Zakat",
      partner: "Partner Name",
      partnerEmail: "partner@example.com",
      businessManagerName: "Business Manager",
      businessManagerEmail: "bm@example.com",
      jobManagerName: "Job Manager",
      jobManagerEmail: "jm@example.com",
      teamLeader: "Team Leader",
      projectId: "PRJ-1",
    };

    const response = await POST(
      inviteRequest({ to: "client@example.com", ...staffFields })
    );

    expect(response.status).toBe(200);
    expect(mocks.createAndSendSurveyInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: expect.objectContaining({
          email: "client@example.com",
          ...staffFields,
        }),
      })
    );
  });

  it("treats empty manager emails as absent", async () => {
    const response = await POST(
      inviteRequest({
        to: "client@example.com",
        businessManagerName: "Business Manager",
        businessManagerEmail: "",
        jobManagerEmail: "  ",
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.createAndSendSurveyInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: expect.objectContaining({
          businessManagerName: "Business Manager",
          businessManagerEmail: undefined,
          jobManagerEmail: undefined,
        }),
      })
    );
  });

  it("rejects a malformed manager email", async () => {
    const response = await POST(
      inviteRequest({
        to: "client@example.com",
        businessManagerName: "Business Manager",
        businessManagerEmail: "not-an-email",
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createAndSendSurveyInvite).not.toHaveBeenCalled();
  });

  it("uses a provided subject when supplied", async () => {
    await POST(
      inviteRequest({
        to: "client@example.com",
        subject: "Custom subject",
      })
    );

    expect(mocks.createAndSendSurveyInvite).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Custom subject" })
    );
  });

  it("rejects payloads that combine single and CSV recipients", async () => {
    const response = await POST(
      inviteRequest({
        to: "client@example.com",
        csv: "email,department\nclient@example.com,Audit",
        subject: "RSM survey",
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createAndSendSurveyInvite).not.toHaveBeenCalled();
    expect(mocks.createAndSendSurveyInvites).not.toHaveBeenCalled();
  });

  it("sends bulk invitations from an emails array", async () => {
    const response = await POST(
      inviteRequest({
        subject: "RSM survey",
        emails: ["a@example.com", "b@example.com"],
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.batchId).toBe("batch-1");
    expect(body.sent).toBe(2);
    expect(mocks.createAndSendSurveyInvites).toHaveBeenCalled();
  });

  it("sends bulk invitations from CSV", async () => {
    const response = await POST(
      inviteRequest({
        subject: "RSM survey",
        csv: "email,firstname,lastname,company\na@example.com,Client,One,Acme",
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.createAndSendSurveyInvites).toHaveBeenCalled();
  });

  it("rate limits integration invite sends", async () => {
    mocks.consumeIntegrationInviteRateLimit.mockResolvedValue({
      allowed: false,
      count: 101,
      limit: 100,
      retryAfterSeconds: 120,
    });

    const response = await POST(
      inviteRequest({
        to: "client@example.com",
        subject: "RSM survey",
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(mocks.createAndSendSurveyInvite).not.toHaveBeenCalled();
  });
});
