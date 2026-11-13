import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notifyCrmSurveyStatus: vi.fn(),
  buildSurveyCompletionPayload: vi.fn(),
  sendSurveyInviteEmail: vi.fn(),
  writeAuditLog: vi.fn(),
  upsertStaffContactsFromRecipient: vi.fn(),
  recomputeInviteOutreachSnapshots: vi.fn(),
  surveyInviteCreate: vi.fn(),
  surveyInviteFindUnique: vi.fn(),
  surveyInviteUpdate: vi.fn(),
  surveyInviteEventCreate: vi.fn(),
  responseFindUnique: vi.fn(),
}));

vi.mock("@/lib/crm/status-webhook", () => ({
  notifyCrmSurveyStatus: mocks.notifyCrmSurveyStatus,
  buildResultLinkUrl: () => "https://voc.example/results/token",
}));

vi.mock("@/lib/crm/completion-payload", () => ({
  buildSurveyCompletionPayload: mocks.buildSurveyCompletionPayload,
}));

vi.mock("@/lib/survey-invite-email", () => ({
  sendSurveyInviteEmail: mocks.sendSurveyInviteEmail,
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock("@/lib/survey-staff-contacts", () => ({
  upsertStaffContactsFromRecipient: mocks.upsertStaffContactsFromRecipient,
}));

vi.mock("@/lib/aggregate", () => ({
  recomputeInviteOutreachSnapshots: mocks.recomputeInviteOutreachSnapshots,
}));

vi.mock("@/lib/db", () => ({
  db: {
    surveyInvite: {
      create: mocks.surveyInviteCreate,
      findUnique: mocks.surveyInviteFindUnique,
      update: mocks.surveyInviteUpdate,
    },
    surveyInviteEvent: {
      create: mocks.surveyInviteEventCreate,
    },
    response: {
      findUnique: mocks.responseFindUnique,
    },
  },
}));

import {
  completeSurveyInviteForResponse,
  createAndSendSurveyInvite,
} from "@/lib/survey-invite-tracking";

const scores = {
  schemaVersion: "1.0" as const,
  inviteId: "invite-1",
  responseId: "response-1",
  externalEngagementId: null,
  triggerStage: null,
  projectId: null,
  idempotencyKey: null,
  email: "client@example.com",
  language: "en",
  surveyVersion: "v1",
  completedAt: "2026-10-07T00:00:00.000Z",
  surveyUrl: "https://voc.example/survey?invite=token",
  resultLinkUrl: "https://voc.example/results/token",
  sentiment: "Satisfied" as const,
  scores: {
    csat: { scale: "1-5" as const, value: 5, comment: null },
    ces: { scale: "1-7" as const, value: 6, comment: null },
    nps: { scale: "0-10" as const, value: 9, comment: null },
  },
};

describe("CRM status timing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendSurveyInviteEmail.mockResolvedValue({ ok: true });
    mocks.surveyInviteEventCreate.mockResolvedValue({
      id: "event-1",
      type: "invite_sent",
      templateId: null,
      message: null,
      actorUserId: null,
      createdAt: new Date(),
    });
    mocks.surveyInviteCreate.mockResolvedValue({
      id: "invite-1",
      email: "client@example.com",
      token: "token",
      resultToken: "result",
      externalEngagementId: null,
      triggerStage: null,
      projectId: null,
      idempotencyKey: null,
    });
  });

  it("does not call the CRM webhook when an invite is sent", async () => {
    await createAndSendSurveyInvite({
      email: "client@example.com",
      subject: "Voice of Client",
      recipient: { email: "client@example.com" },
    });

    expect(mocks.notifyCrmSurveyStatus).not.toHaveBeenCalled();
  });

  it("stores service, partner, and manager fields on the invite row", async () => {
    const staffFields = {
      serviceName: "Zakat",
      partner: "Partner Name",
      partnerEmail: "partner@example.com",
      businessManagerName: "Business Manager",
      businessManagerEmail: "bm@example.com",
      jobManagerName: "Job Manager",
      jobManagerEmail: "jm@example.com",
      teamLeader: "Team Leader",
    };

    await createAndSendSurveyInvite({
      email: "client@example.com",
      subject: "Voice of Client",
      recipient: { email: "client@example.com", ...staffFields },
    });

    expect(mocks.surveyInviteCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: "client@example.com", ...staffFields }),
    });
    expect(mocks.upsertStaffContactsFromRecipient).toHaveBeenCalledWith(
      expect.objectContaining(staffFields)
    );
  });

  it("returns the existing invite unchanged when the idempotency key is reused", async () => {
    mocks.surveyInviteFindUnique.mockResolvedValue({
      id: "invite-old",
      idempotencyKey: "crm-key-123",
      businessManagerName: null,
    });

    const result = await createAndSendSurveyInvite({
      email: "client@example.com",
      subject: "Voice of Client",
      recipient: {
        email: "client@example.com",
        idempotencyKey: "crm-key-123",
        businessManagerName: "Business Manager",
      },
    });

    expect(result.reused).toBe(true);
    expect(mocks.surveyInviteCreate).not.toHaveBeenCalled();
    expect(mocks.sendSurveyInviteEmail).not.toHaveBeenCalled();
  });

  it("posts completed only when CSAT, CES, and NPS are present", async () => {
    mocks.responseFindUnique.mockResolvedValue({
      csatScore: 5,
      cesScore: 6,
      npsScore: 9,
      completedAt: new Date("2026-10-07T00:00:00.000Z"),
      clientId: "client-1",
      client: { id: "client-1", email: "client@example.com" },
    });
    mocks.surveyInviteFindUnique.mockResolvedValue({
      id: "invite-1",
      responseId: null,
      email: "client@example.com",
      token: "token",
      resultToken: "result",
      externalEngagementId: null,
      triggerStage: null,
      projectId: null,
      idempotencyKey: null,
      department: null,
      partner: null,
    });
    mocks.surveyInviteUpdate.mockResolvedValue({});
    mocks.buildSurveyCompletionPayload.mockResolvedValue(scores);

    const completed = await completeSurveyInviteForResponse("response-1", {
      inviteToken: "token",
    });

    expect(completed).toBe(true);
    expect(mocks.notifyCrmSurveyStatus).toHaveBeenCalledTimes(1);
    expect(mocks.notifyCrmSurveyStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        scores: expect.objectContaining({
          scores: expect.objectContaining({
            csat: expect.objectContaining({ value: 5 }),
            ces: expect.objectContaining({ value: 6 }),
            nps: expect.objectContaining({ value: 9 }),
          }),
        }),
      })
    );
  });

  it("skips the CRM webhook when the completion payload has no scores", async () => {
    mocks.responseFindUnique.mockResolvedValue({
      csatScore: 5,
      cesScore: 6,
      npsScore: 9,
      completedAt: new Date("2026-10-07T00:00:00.000Z"),
      clientId: "client-1",
      client: { id: "client-1", email: "client@example.com" },
    });
    mocks.surveyInviteFindUnique.mockResolvedValue({
      id: "invite-1",
      responseId: null,
      email: "client@example.com",
      token: "token",
      resultToken: "result",
      externalEngagementId: null,
      triggerStage: null,
      projectId: null,
      idempotencyKey: null,
    });
    mocks.surveyInviteUpdate.mockResolvedValue({});
    mocks.buildSurveyCompletionPayload.mockResolvedValue(null);

    await completeSurveyInviteForResponse("response-1", { inviteToken: "token" });

    expect(mocks.notifyCrmSurveyStatus).not.toHaveBeenCalled();
  });
});
