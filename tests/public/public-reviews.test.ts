import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    publicReviewSnippet: { findMany: mocks.findMany },
  },
}));

import { getPublicReviews } from "@/lib/public-reviews";

describe("public reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([
      {
        completedAt: new Date("2026-09-10T12:00:00.000Z"),
        comment: "Clear communication throughout the engagement.",
        respondentName: "Alex Client",
        company: "Example Co",
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
      },
    ]);
  });

  it("returns review fields including attribution", async () => {
    await expect(getPublicReviews()).resolves.toEqual({
      limit: 12,
      count: 1,
      reviews: [
        {
          date: "2026-09-10T12:00:00.000Z",
          comment: "Clear communication throughout the engagement.",
          name: "Alex Client",
          company: "Example Co",
          csat: 5,
          ces: 6,
          nps: 9,
        },
      ],
    });
  });

  it("queries only PublicReviewSnippet without contact fields", async () => {
    await getPublicReviews();
    expect(mocks.findMany).toHaveBeenCalledOnce();
    expect(mocks.findMany.mock.calls[0][0]).toMatchObject({
      select: {
        completedAt: true,
        comment: true,
        respondentName: true,
        company: true,
        csatScore: true,
        cesScore: true,
        npsScore: true,
      },
    });
    expect(JSON.stringify(mocks.findMany.mock.calls[0][0])).not.toMatch(
      /sourceKey|email|phone|rawPayload/
    );
  });
});
