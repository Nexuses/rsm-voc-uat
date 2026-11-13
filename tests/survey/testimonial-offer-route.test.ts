import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeSurveyRateLimit: vi.fn(),
  resolveTestimonialOfferByConversationId: vi.fn(),
}));

vi.mock("@/lib/survey/request-security", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/survey/request-security")>();
  return {
    ...actual,
    consumeSurveyRateLimit: mocks.consumeSurveyRateLimit,
  };
});

vi.mock("@/lib/testimonials/offer", () => ({
  resolveTestimonialOfferByConversationId:
    mocks.resolveTestimonialOfferByConversationId,
}));

import { POST } from "@/app/api/survey/testimonial-offer/route";

function offerRequest(body: unknown, origin = "https://rsm-voc-platform.vercel.app") {
  return new NextRequest(
    "https://rsm-voc-platform.vercel.app/api/survey/testimonial-offer",
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

describe("POST /api/survey/testimonial-offer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeSurveyRateLimit.mockResolvedValue({
      allowed: true,
      count: 1,
      limit: 20,
      retryAfterSeconds: 600,
    });
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(
      offerRequest(
        { conversationId: "conv-12345678" },
        "https://attacker.example"
      )
    );
    expect(response.status).toBe(403);
    expect(mocks.resolveTestimonialOfferByConversationId).not.toHaveBeenCalled();
  });

  it("returns ready without respondent identity", async () => {
    mocks.resolveTestimonialOfferByConversationId.mockResolvedValue({
      status: "ready",
      ask: {
        id: "t1",
        kind: "draft_approval",
        url: "https://survey.example/testimonial/tok",
      },
    });

    const response = await POST(
      offerRequest({ conversationId: "conv-12345678" })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      kind: "draft_approval",
      url: "https://survey.example/testimonial/tok",
    });
  });

  it("returns pending while the voice webhook has not landed", async () => {
    mocks.resolveTestimonialOfferByConversationId.mockResolvedValue({
      status: "pending",
    });
    const response = await POST(
      offerRequest({ conversationId: "conv-pending1" })
    );
    await expect(response.json()).resolves.toEqual({ status: "pending" });
  });
});
