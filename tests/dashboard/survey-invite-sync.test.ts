import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  surveyInviteFindMany: vi.fn(),
  surveyInviteFindUnique: vi.fn(),
  surveyInviteUpdate: vi.fn(),
  surveyInviteEventCreate: vi.fn(),
  responseFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    surveyInvite: {
      findMany: mocks.surveyInviteFindMany,
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

vi.mock("@/lib/aggregate", () => ({
  recomputeInviteOutreachSnapshots: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/survey-thankyou-email", () => ({
  sendSurveyCompletionNotifications: vi.fn().mockResolvedValue({
    client: { sent: false, reason: "no_pending_invite" },
    team: { sent: false, reason: "no_recipients" },
  }),
}));

import {
  syncUncompletedInvitesWithResponses,
  tryCompleteInviteForConversation,
} from "@/lib/survey-invite-tracking";
import { sendSurveyCompletionNotifications } from "@/lib/survey-thankyou-email";

describe("invite completion sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.surveyInviteUpdate.mockResolvedValue({});
    mocks.surveyInviteEventCreate.mockResolvedValue({
      id: "event-1",
      type: "completed",
      templateId: null,
      message: null,
      actorUserId: null,
      createdAt: new Date(),
    });
  });

  it("completes an invite when the voice response already exists", async () => {
    mocks.responseFindUnique
      .mockResolvedValueOnce({
        id: "response-1",
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
        completedAt: new Date("2026-06-24T15:25:55.000Z"),
        createdAt: new Date("2026-06-24T15:26:03.653Z"),
      })
      .mockResolvedValueOnce({
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
        completedAt: new Date("2026-06-24T15:25:55.000Z"),
      });
    mocks.surveyInviteFindUnique.mockResolvedValue({
      id: "invite-1",
      responseId: null,
      conversationId: "conv_0701kvx3e2jseg0r3p7p7yn6zfdt",
      startedAt: new Date("2026-06-24T15:19:11.448Z"),
      openedAt: new Date("2026-06-24T15:19:01.821Z"),
    });

    const completed = await tryCompleteInviteForConversation(
      "conv_0701kvx3e2jseg0r3p7p7yn6zfdt"
    );

    expect(completed).toBe(true);
    expect(mocks.surveyInviteUpdate).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: expect.objectContaining({
        responseId: "response-1",
        completedAt: new Date("2026-06-24T15:25:55.000Z"),
      }),
    });
    expect(sendSurveyCompletionNotifications).toHaveBeenCalledWith(
      "response-1"
    );
  });

  it("does not complete an invite when the voice response is missing metrics", async () => {
    mocks.responseFindUnique.mockResolvedValue({
      id: "response-1",
      csatScore: 4,
      cesScore: null,
      npsScore: 8,
      completedAt: null,
      createdAt: new Date("2026-06-24T15:26:03.653Z"),
    });

    const completed = await tryCompleteInviteForConversation(
      "conv_partial_voice"
    );

    expect(completed).toBe(false);
    expect(mocks.surveyInviteUpdate).not.toHaveBeenCalled();
  });

  it("syncs all linked invites that are missing completion", async () => {
    mocks.surveyInviteFindMany.mockResolvedValue([
      { conversationId: "conv_a" },
      { conversationId: "conv_b" },
    ]);
    mocks.responseFindUnique
      .mockResolvedValueOnce({
        id: "response-a",
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
        completedAt: new Date("2026-06-24T10:00:00.000Z"),
        createdAt: new Date("2026-06-24T10:00:05.000Z"),
      })
      .mockResolvedValueOnce({
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
        completedAt: new Date("2026-06-24T10:00:00.000Z"),
      })
      .mockResolvedValueOnce(null);
    mocks.surveyInviteFindUnique.mockResolvedValue({
      id: "invite-a",
      responseId: null,
      conversationId: "conv_a",
      startedAt: new Date("2026-06-24T09:00:00.000Z"),
      openedAt: new Date("2026-06-24T09:00:00.000Z"),
    });

    const synced = await syncUncompletedInvitesWithResponses();

    expect(synced).toBe(1);
    expect(mocks.surveyInviteUpdate).toHaveBeenCalledTimes(1);
  });
});
