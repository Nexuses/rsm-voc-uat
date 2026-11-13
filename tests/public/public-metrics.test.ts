import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  snapshotFindMany: vi.fn(),
  themeFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    csatSnapshot: { findMany: mocks.snapshotFindMany },
    themeRollup: { findMany: mocks.themeFindMany },
  },
}));

import { getPublicMetrics } from "@/lib/public-csat";

describe("PII-free public metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.snapshotFindMany.mockResolvedValue([
      {
        period: "2026-05",
        avgRating: 4,
        responseCount: 2,
        distribution: { "1": 0, "2": 0, "3": 1, "4": 0, "5": 1 },
        csatFavorablePercent: 50,
        cesAverage: 5,
        cesFavorablePercent: 50,
        cesResponseCount: 2,
        cesDistribution: {
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 1,
          "5": 0,
          "6": 1,
          "7": 0,
        },
        npsScore: 50,
        npsResponseCount: 2,
        npsDistribution: {
          "0": 0,
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
          "5": 0,
          "6": 0,
          "7": 1,
          "8": 0,
          "9": 0,
          "10": 1,
        },
        promoterPercent: 50,
        passivePercent: 50,
        detractorPercent: 0,
        totalResponseCount: 2,
        completeResponseCount: 2,
        voiceResponseCount: 1,
        invitesSentCount: 10,
        inviteResponsesCount: 4,
      },
      {
        period: "2026-06",
        avgRating: 5,
        responseCount: 3,
        distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 3 },
        csatFavorablePercent: 100,
        cesAverage: 6,
        cesFavorablePercent: 100,
        cesResponseCount: 3,
        cesDistribution: {
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
          "5": 0,
          "6": 3,
          "7": 0,
        },
        npsScore: 33.33,
        npsResponseCount: 3,
        npsDistribution: {
          "0": 0,
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
          "5": 0,
          "6": 1,
          "7": 0,
          "8": 0,
          "9": 1,
          "10": 1,
        },
        promoterPercent: 66.67,
        passivePercent: 0,
        detractorPercent: 33.33,
        totalResponseCount: 3,
        completeResponseCount: 3,
        voiceResponseCount: 2,
        invitesSentCount: 5,
        inviteResponsesCount: 3,
      },
    ]);
    mocks.themeFindMany.mockResolvedValue([
      {
        themeLabel: "Responsiveness",
        sentiment: "positive",
        mentionCount: 4,
        publicSummary: "Clients value timely communication.",
      },
    ]);
  });

  it("returns weighted all-time CSAT, CES, and NPS", async () => {
    await expect(getPublicMetrics()).resolves.toMatchObject({
      period: "all-time",
      latestPeriod: "2026-06",
      totalResponses: 5,
      completeResponseCount: 5,
      completionPercent: 100,
      voiceResponseCount: 3,
      voicePercent: 60,
      surveysSent: 15,
      inviteResponsesReceived: 7,
      inviteResponseRate: 47,
      csat: {
        score: 4.6,
        favorablePercent: 80,
        responseCount: 5,
      },
      ces: {
        score: 5.6,
        favorablePercent: 80,
        responseCount: 5,
      },
      nps: {
        score: 40,
        promoterPercent: 60,
        passivePercent: 20,
        detractorPercent: 20,
        responseCount: 5,
      },
      overallAvg: 4.6,
      distribution: { "1": 0, "2": 0, "3": 1, "4": 0, "5": 4 },
    });
  });

  it("queries only the two approved public aggregate models", async () => {
    const result = await getPublicMetrics();

    expect(mocks.snapshotFindMany).toHaveBeenCalledOnce();
    expect(mocks.themeFindMany).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toMatch(
      /client|company|designation|comment|rawPayload|ResponseInsight/
    );
  });
});
