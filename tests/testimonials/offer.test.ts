import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  responseFindUnique: vi.fn(),
  prepareThankYouTestimonial: vi.fn(),
  markTestimonialRequested: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    response: { findUnique: mocks.responseFindUnique },
  },
}));

vi.mock("@/lib/testimonials/prepare", () => ({
  prepareThankYouTestimonial: mocks.prepareThankYouTestimonial,
  markTestimonialRequested: mocks.markTestimonialRequested,
}));

import {
  offerTestimonialForResponse,
  resolveTestimonialOfferByConversationId,
} from "@/lib/testimonials/offer";

describe("testimonial thank-you offer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markTestimonialRequested.mockResolvedValue(undefined);
  });

  it("returns null when the response is incomplete or not Positive", async () => {
    mocks.responseFindUnique.mockResolvedValue({
      csatScore: 2,
      cesScore: 3,
      npsScore: 4,
      answers: [],
      surveyInvite: null,
    });

    await expect(
      offerTestimonialForResponse({ responseId: "r1" })
    ).resolves.toBeNull();
    expect(mocks.prepareThankYouTestimonial).not.toHaveBeenCalled();
  });

  it("prepares and marks requested for an overall Positive response", async () => {
    mocks.responseFindUnique.mockResolvedValue({
      csatScore: 5,
      cesScore: 6,
      npsScore: 10,
      answers: [{ reason_text: "Great work" }],
      surveyInvite: { id: "invite-1" },
    });
    mocks.prepareThankYouTestimonial.mockResolvedValue({
      id: "t1",
      kind: "draft_approval",
      url: "https://survey.example/testimonial/tok",
    });

    const ask = await offerTestimonialForResponse({ responseId: "r1" });

    expect(ask).toEqual({
      id: "t1",
      kind: "draft_approval",
      url: "https://survey.example/testimonial/tok",
    });
    expect(mocks.prepareThankYouTestimonial).toHaveBeenCalledWith(
      expect.objectContaining({
        responseId: "r1",
        surveyInviteId: "invite-1",
      })
    );
    expect(mocks.markTestimonialRequested).toHaveBeenCalledWith("t1");
  });

  it("reports pending until the conversation response exists", async () => {
    mocks.responseFindUnique.mockResolvedValue(null);
    await expect(
      resolveTestimonialOfferByConversationId("conv-missing")
    ).resolves.toEqual({ status: "pending" });
  });

  it("reports ready when the stored conversation is Positive", async () => {
    mocks.responseFindUnique
      .mockResolvedValueOnce({
        id: "r1",
        csatScore: 5,
        cesScore: 6,
        npsScore: 10,
        surveyInvite: null,
      })
      .mockResolvedValueOnce({
        csatScore: 5,
        cesScore: 6,
        npsScore: 10,
        answers: [],
        surveyInvite: null,
      });
    mocks.prepareThankYouTestimonial.mockResolvedValue({
      id: "t2",
      kind: "original_request",
      url: "https://survey.example/testimonial/tok2",
    });

    await expect(
      resolveTestimonialOfferByConversationId("conv-1")
    ).resolves.toEqual({
      status: "ready",
      ask: {
        id: "t2",
        kind: "original_request",
        url: "https://survey.example/testimonial/tok2",
      },
    });
  });
});
