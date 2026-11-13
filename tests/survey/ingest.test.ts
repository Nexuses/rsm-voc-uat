import { beforeEach, describe, expect, it, vi } from "vitest";
import { SURVEY_QUESTIONS, SURVEY_VERSION } from "@/lib/survey/constants";
import type { NormalizedSurveyInput } from "@/lib/survey/schema";

const mocks = vi.hoisted(() => ({
  responseFindUnique: vi.fn(),
  responseFindMany: vi.fn(),
  responseUpsert: vi.fn(),
  responseUpdateMany: vi.fn(),
  surveyInviteFindUnique: vi.fn(),
  insightFindUnique: vi.fn(),
  insightCreate: vi.fn(),
  embeddingFindUnique: vi.fn(),
  executeRawUnsafe: vi.fn(),
  generateInsight: vi.fn(),
  embedText: vi.fn(),
  buildEmbeddingContent: vi.fn(),
  parseInsight: vi.fn(),
  recomputeAggregates: vi.fn(),
  sendSurveyCompletionNotifications: vi.fn(),
  emitEventSafely: vi.fn(),
}));

vi.mock("@/lib/events/emit", () => ({
  emitEventSafely: mocks.emitEventSafely,
}));

vi.mock("@/lib/db", () => ({
  db: {
    response: {
      findUnique: mocks.responseFindUnique,
      findMany: mocks.responseFindMany,
      upsert: mocks.responseUpsert,
      updateMany: mocks.responseUpdateMany,
    },
    surveyInvite: {
      findUnique: mocks.surveyInviteFindUnique,
    },
    responseInsight: {
      findUnique: mocks.insightFindUnique,
      create: mocks.insightCreate,
    },
    responseEmbedding: {
      findUnique: mocks.embeddingFindUnique,
    },
    $executeRawUnsafe: mocks.executeRawUnsafe,
  },
}));

vi.mock("@/lib/aggregate", () => ({
  recomputeAggregates: mocks.recomputeAggregates,
}));

vi.mock("@/lib/insight", () => ({
  INSIGHT_MODEL: "test-model",
  generateInsight: mocks.generateInsight,
  embedText: mocks.embedText,
  buildEmbeddingContent: mocks.buildEmbeddingContent,
  parseInsight: mocks.parseInsight,
}));

vi.mock("@/lib/survey-thankyou-email", () => ({
  sendSurveyCompletionNotifications: mocks.sendSurveyCompletionNotifications,
}));

vi.mock("@/lib/survey-invite-tracking", () => ({
  completeSurveyInviteForResponse: vi.fn().mockResolvedValue(false),
  reconcileVoiceInviteCompletion: vi.fn().mockResolvedValue(false),
  syncUncompletedInvitesWithResponses: vi.fn().mockResolvedValue(0),
  tryCompleteInviteForConversation: vi.fn().mockResolvedValue(false),
}));

import { ingestSurveyResponse } from "@/lib/survey/ingest";
import {
  completeSurveyInviteForResponse,
  reconcileVoiceInviteCompletion,
  syncUncompletedInvitesWithResponses,
  tryCompleteInviteForConversation,
} from "@/lib/survey-invite-tracking";

const insight = {
  overallSentiment: "positive",
  satisfactionSummary: "The client is satisfied.",
  keyDrivers: ["responsiveness"],
  riskSignals: [],
  suggestedReply: { en: "Thank you.", ar: "" },
  nextSteps: ["Maintain service"],
};

const input: NormalizedSurveyInput = {
  source: "typed",
  conversationId: "typed_c397db2e-8c0b-48fd-a963-cf477c65486b",
  clientName: "Noor Al-Sabah",
  email: "noor@example.com",
  company: "Example Co",
  designation: "Finance Director",
  surveyVersion: SURVEY_VERSION,
  language: "en",
  answers: [
    {
      question_number: 1,
      question_text: SURVEY_QUESTIONS[0].question,
      metric: "csat",
      scale_min: 1,
      scale_max: 5,
      rating: 5,
      reason_text: "The team was responsive.",
      reason_method: "typed",
    },
    {
      question_number: 2,
      question_text: SURVEY_QUESTIONS[1].question,
      metric: "ces",
      scale_min: 1,
      scale_max: 7,
      rating: 6,
    },
    {
      question_number: 3,
      question_text: SURVEY_QUESTIONS[2].question,
      metric: "nps",
      scale_min: 0,
      scale_max: 10,
      rating: 9,
    },
  ],
  rawPayload: { source: "typed" },
  startedAt: new Date("2026-06-12T10:00:00.000Z"),
  completedAt: new Date("2026-06-12T10:01:00.000Z"),
};

describe("shared survey ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.responseFindUnique.mockResolvedValue(null);
    mocks.responseFindMany.mockResolvedValue([]);
    mocks.responseUpdateMany.mockResolvedValue({ count: 0 });
    mocks.surveyInviteFindUnique.mockResolvedValue(null);
    mocks.responseUpsert.mockResolvedValue({ id: "response-1" });
    mocks.insightFindUnique.mockResolvedValue(null);
    mocks.insightCreate.mockResolvedValue({ id: "insight-1" });
    mocks.embeddingFindUnique.mockResolvedValue(null);
    mocks.executeRawUnsafe.mockResolvedValue(1);
    mocks.generateInsight.mockResolvedValue(insight);
    mocks.embedText.mockResolvedValue([0.1, 0.2]);
    mocks.buildEmbeddingContent.mockReturnValue("embedding content");
    mocks.parseInsight.mockImplementation((value) => value);
    mocks.recomputeAggregates.mockResolvedValue(undefined);
    mocks.sendSurveyCompletionNotifications.mockResolvedValue({
      client: { sent: false, reason: "no_pending_invite" },
      team: { sent: false, reason: "no_recipients" },
    });
  });

  it("creates one normalized response, client, insight, and embedding", async () => {
    await expect(ingestSurveyResponse(input)).resolves.toEqual({
      responseId: "response-1",
      created: true,
    });

    expect(mocks.responseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId: input.conversationId },
        create: expect.objectContaining({
          surveyVersion: SURVEY_VERSION,
          avgRating: 5,
          csatScore: 5,
          cesScore: 6,
          npsScore: 9,
          client: {
            create: {
              name: "Noor Al-Sabah",
              email: "noor@example.com",
              company: "Example Co",
              designation: "Finance Director",
              locale: "en",
            },
          },
        }),
      })
    );
    expect(mocks.emitEventSafely).toHaveBeenCalledWith({
      type: "SURVEY_RESPONSE_SUBMITTED",
      idempotencyKey: "response:response-1:submitted",
      aggregateId: "response-1",
      payload: {
        responseId: "response-1",
        surveyVersion: SURVEY_VERSION,
        source: "typed",
      },
    });
    expect(mocks.insightCreate).toHaveBeenCalledOnce();
    expect(mocks.executeRawUnsafe).toHaveBeenCalledOnce();
    expect(mocks.recomputeAggregates).toHaveBeenCalledOnce();
    expect(mocks.sendSurveyCompletionNotifications).toHaveBeenCalledWith(
      "response-1"
    );
  });

  it("updates the linked client and reuses enrichment on retry", async () => {
    mocks.responseFindUnique.mockResolvedValue({
      id: "response-1",
      clientId: "client-1",
    });
    mocks.insightFindUnique.mockResolvedValue({
      ...insight,
      responseId: "response-1",
    });
    mocks.embeddingFindUnique.mockResolvedValue({ id: "embedding-1" });

    await expect(ingestSurveyResponse(input)).resolves.toEqual({
      responseId: "response-1",
      created: false,
    });

    expect(mocks.responseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          client: {
            upsert: {
              create: {
                name: "Noor Al-Sabah",
                email: "noor@example.com",
                company: "Example Co",
                designation: "Finance Director",
                locale: "en",
              },
              update: {
                name: "Noor Al-Sabah",
                email: "noor@example.com",
                company: "Example Co",
                designation: "Finance Director",
                locale: "en",
              },
            },
          },
        }),
      })
    );
    expect(mocks.insightCreate).not.toHaveBeenCalled();
    expect(mocks.embedText).not.toHaveBeenCalled();
  });

  it("stores incomplete voice responses without completedAt or invite completion", async () => {
    const partialInput: NormalizedSurveyInput = {
      ...input,
      source: "elevenlabs",
      conversationId: "conv_partial",
      answers: [input.answers[0], input.answers[2]],
      completedAt: new Date("2026-06-12T10:01:00.000Z"),
    };

    await ingestSurveyResponse(partialInput);

    expect(mocks.responseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          csatScore: 5,
          cesScore: null,
          npsScore: 9,
          completedAt: null,
        }),
      })
    );
    expect(completeSurveyInviteForResponse).not.toHaveBeenCalled();
    expect(reconcileVoiceInviteCompletion).not.toHaveBeenCalled();
    expect(tryCompleteInviteForConversation).not.toHaveBeenCalled();
    expect(syncUncompletedInvitesWithResponses).not.toHaveBeenCalled();
    expect(mocks.sendSurveyCompletionNotifications).not.toHaveBeenCalled();
  });

  it("keeps a stored response successful when enrichment and aggregates fail", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.generateInsight.mockRejectedValue(new Error("provider unavailable"));
    mocks.recomputeAggregates.mockRejectedValue(
      new Error("aggregate unavailable")
    );

    await expect(ingestSurveyResponse(input)).resolves.toEqual({
      responseId: "response-1",
      created: true,
    });
    expect(mocks.responseUpsert).toHaveBeenCalledOnce();
    expect(mocks.recomputeAggregates).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledTimes(2);
  });

  it("resolves overwrite email from invite conversationId for voice completions", async () => {
    const voiceInput: NormalizedSurveyInput = {
      ...input,
      source: "elevenlabs",
      conversationId: "conv_tracked_invite",
      email: undefined,
      inviteToken: undefined,
    };
    mocks.surveyInviteFindUnique.mockResolvedValue({
      email: "client@example.com",
    });
    mocks.responseFindMany.mockResolvedValue([{ id: "older-response" }]);
    mocks.responseUpdateMany.mockResolvedValue({ count: 1 });

    await ingestSurveyResponse(voiceInput);

    expect(mocks.surveyInviteFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId: "conv_tracked_invite" },
      })
    );
    expect(mocks.responseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              surveyInvite: {
                email: { equals: "client@example.com", mode: "insensitive" },
              },
            },
          ]),
        }),
      })
    );
    expect(mocks.responseUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["older-response"] } },
      })
    );
  });
});
