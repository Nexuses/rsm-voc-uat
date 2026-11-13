import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SURVEY_QUESTIONS, SURVEY_VERSION } from "@/lib/survey/constants";

const mocks = vi.hoisted(() => ({
  consumeSurveyRateLimit: vi.fn(),
  ingestSurveyResponseDeferred: vi.fn(),
  offerTestimonialForResponse: vi.fn(),
  resolveInviteIdForToken: vi.fn(),
}));

vi.mock("@/lib/survey/request-security", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/survey/request-security")
    >();
  return {
    ...actual,
    consumeSurveyRateLimit: mocks.consumeSurveyRateLimit,
  };
});

vi.mock("@/lib/survey/ingest", () => ({
  ingestSurveyResponseDeferred: mocks.ingestSurveyResponseDeferred,
}));

vi.mock("@/lib/testimonials/offer", () => ({
  offerTestimonialForResponse: mocks.offerTestimonialForResponse,
  resolveInviteIdForToken: mocks.resolveInviteIdForToken,
}));

import { POST } from "@/app/api/survey/typed/route";

const submissionId = "c397db2e-8c0b-48fd-a963-cf477c65486b";
const validPayload = {
  submissionId,
  fullName: "Noor Al-Sabah",
  email: "noor@example.com",
  company: "Example Co",
  designation: "Finance Director",
  csatRating: 5,
  csatComment: "The team was responsive.",
  cesRating: 6,
  cesComment: "The process was straightforward.",
  npsRating: 9,
  npsComment: "I would recommend the team.",
  website: "",
};

function typedRequest(
  payload: unknown = validPayload,
  options: {
    origin?: string;
    contentType?: string;
  } = {}
) {
  const origin =
    options.origin ?? "https://rsm-voc-platform.vercel.app";
  return new NextRequest(
    "https://rsm-voc-platform.vercel.app/api/survey/typed",
    {
      method: "POST",
      headers: {
        "content-type": options.contentType ?? "application/json",
        origin,
        "sec-fetch-site":
          origin === "https://rsm-voc-platform.vercel.app"
            ? "same-origin"
            : "cross-site",
      },
      body: JSON.stringify(payload),
    }
  );
}

describe("typed survey route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeSurveyRateLimit.mockResolvedValue({
      allowed: true,
      count: 1,
      limit: 20,
      retryAfterSeconds: 600,
    });
    mocks.ingestSurveyResponseDeferred.mockResolvedValue({
      responseId: "response-1",
      created: true,
    });
    mocks.resolveInviteIdForToken.mockResolvedValue(null);
    mocks.offerTestimonialForResponse.mockResolvedValue(null);
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(
      typedRequest(validPayload, {
        origin: "https://attacker.example",
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.ingestSurveyResponseDeferred).not.toHaveBeenCalled();
  });

  it("requires JSON", async () => {
    const response = await POST(
      typedRequest(validPayload, { contentType: "text/plain" })
    );

    expect(response.status).toBe(415);
  });

  it("rejects invalid ratings and populated honeypots", async () => {
    const invalidRating = await POST(
      typedRequest({ ...validPayload, npsRating: 11 })
    );
    const honeypot = await POST(
      typedRequest({ ...validPayload, website: "spam.example" })
    );

    expect(invalidRating.status).toBe(400);
    expect(honeypot.status).toBe(400);
    expect(mocks.ingestSurveyResponseDeferred).not.toHaveBeenCalled();
  });

  it("returns 429 with a retry hint when the limit is exceeded", async () => {
    mocks.consumeSurveyRateLimit.mockResolvedValue({
      allowed: false,
      count: 21,
      limit: 20,
      retryAfterSeconds: 240,
    });

    const response = await POST(typedRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("240");
    expect(mocks.ingestSurveyResponseDeferred).not.toHaveBeenCalled();
  });

  it("normalizes a valid typed survey without returning private data", async () => {
    mocks.offerTestimonialForResponse.mockResolvedValue({
      id: "t1",
      kind: "draft_approval",
      url: "https://survey.example/testimonial/tok",
    });
    const response = await POST(typedRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      testimonial: {
        kind: "draft_approval",
        url: "https://survey.example/testimonial/tok",
      },
    });
    expect(mocks.offerTestimonialForResponse).toHaveBeenCalledWith({
      responseId: "response-1",
      surveyInviteId: null,
    });
    expect(mocks.ingestSurveyResponseDeferred).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "typed",
        conversationId: `typed_${submissionId}`,
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
            reason_text: "The process was straightforward.",
            reason_method: "typed",
          },
          {
            question_number: 3,
            question_text: SURVEY_QUESTIONS[2].question,
            metric: "nps",
            scale_min: 0,
            scale_max: 10,
            rating: 9,
            reason_text: "I would recommend the team.",
            reason_method: "typed",
          },
        ],
      })
    );
    const rawPayload =
      mocks.ingestSurveyResponseDeferred.mock.calls[0][0].rawPayload;
    expect(rawPayload.website).toBeUndefined();
    expect(rawPayload.fullName).toBe("Noor Al-Sabah");
    expect(rawPayload.email).toBe("noor@example.com");
  });

  it("maps retries of the same UUID to the same conversation ID", async () => {
    await POST(typedRequest());
    await POST(typedRequest());

    expect(
      mocks.ingestSurveyResponseDeferred.mock.calls.map(
        ([input]) => input.conversationId
      )
    ).toEqual([`typed_${submissionId}`, `typed_${submissionId}`]);
  });
});
