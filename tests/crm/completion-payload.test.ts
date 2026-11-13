import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    surveyInvite: {
      findUnique: mocks.findUnique,
    },
  },
}));

vi.mock("@/lib/app-base-url", () => ({
  getSurveyUrl: () => "https://survey.example.com/survey",
}));

vi.mock("@/lib/crm/status-webhook", () => ({
  buildResultLinkUrl: (token: string) =>
    `https://voc.example.com/results/${token}`,
}));

import { buildSurveyCompletionPayload } from "@/lib/crm/completion-payload";

describe("buildSurveyCompletionPayload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes idempotencyKey and combined-score sentiment", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "invite-1",
      email: "client@example.com",
      token: "invite-token",
      resultToken: "result-token",
      externalEngagementId: "ENG-1",
      triggerStage: "post",
      projectId: "PRJ-1",
      idempotencyKey: "ENG-1-post-client@example.com",
      completedAt: new Date("2026-08-25T12:05:00.000Z"),
      response: {
        id: "response-1",
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
        answers: [
          {
            question_number: 1,
            rating: 5,
            reason_text: "Great",
          },
          {
            question_number: 2,
            rating: 6,
            reason_text: null,
          },
          {
            question_number: 3,
            rating: 9,
            reason_text: "Yes",
          },
        ],
        completedAt: new Date("2026-08-25T12:05:00.000Z"),
        language: "en",
        surveyVersion: "three-metric-v1",
      },
    });

    const payload = await buildSurveyCompletionPayload("invite-1");

    expect(payload).toMatchObject({
      schemaVersion: "1.0",
      inviteId: "invite-1",
      responseId: "response-1",
      idempotencyKey: "ENG-1-post-client@example.com",
      // 5+6+9 = 20/22 → Satisfied (matches email Positive)
      sentiment: "Satisfied",
      scores: {
        csat: { value: 5, comment: "Great" },
        ces: { value: 6, comment: null },
        nps: { value: 9, comment: "Yes" },
      },
    });
  });

  it("uses combined score for sentiment, not CSAT alone (17/22 → Neutral)", async () => {
    // Reported mismatch: CSAT 4 would be Satisfied under the old CSAT-only
    // rule, but 4+5+8 = 17/22 (77%) is Neutral — same as the email.
    mocks.findUnique.mockResolvedValue({
      id: "invite-bah",
      email: "client@example.com",
      token: "invite-token",
      resultToken: "result-token",
      externalEngagementId: null,
      triggerStage: "post",
      projectId: "BAH06025AUDIT",
      idempotencyKey: "89401502-c5cb-f111-a05c-0022489ef515",
      completedAt: new Date("2026-11-08T06:00:00.000Z"),
      response: {
        id: "bcb14589-15a9-4caf-8b5b-754332d85013",
        csatScore: 4,
        cesScore: 5,
        npsScore: 8,
        answers: [],
        completedAt: new Date("2026-11-08T06:00:00.000Z"),
        language: "en",
        surveyVersion: "three-metric-v1",
      },
    });

    const payload = await buildSurveyCompletionPayload("invite-bah");

    expect(payload?.sentiment).toBe("Neutral");
    expect(payload?.scores).toMatchObject({
      csat: { value: 4 },
      ces: { value: 5 },
      nps: { value: 8 },
    });
  });

  it("returns null when invite has no response", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "invite-1",
      response: null,
    });
    await expect(buildSurveyCompletionPayload("invite-1")).resolves.toBeNull();
  });
});
