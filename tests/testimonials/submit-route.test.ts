import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  publicReviewCreate: vi.fn(),
  auditCreate: vi.fn(),
  validatePublicPost: vi.fn(),
  consumeSurveyRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testimonial: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
    publicReviewSnippet: {
      create: mocks.publicReviewCreate,
      createMany: mocks.publicReviewCreate,
      deleteMany: mocks.publicReviewCreate,
    },
    auditLog: {
      create: mocks.auditCreate,
    },
  },
}));

vi.mock("@/lib/survey/request-security", () => ({
  validatePublicPost: mocks.validatePublicPost,
  consumeSurveyRateLimit: mocks.consumeSurveyRateLimit,
}));

import { POST } from "@/app/api/testimonial/[token]/route";

const token = "abcdefghijklmnopqrstuvwxyz012345";

function request(body: unknown) {
  return new NextRequest(`http://localhost:3000/api/testimonial/${token}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/testimonial/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validatePublicPost.mockReturnValue({ ok: true });
    mocks.consumeSurveyRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    mocks.findUnique.mockResolvedValue({ id: "testimonial-1", status: "requested" });
    mocks.update.mockResolvedValue({});
    mocks.auditCreate.mockResolvedValue({});
  });

  it("returns 404 for an unknown token", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const response = await POST(request({ action: "decline" }), {
      params: Promise.resolve({ token }),
    });
    expect(response.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.publicReviewCreate).not.toHaveBeenCalled();
  });

  it("stores consent without writing a public review", async () => {
    const response = await POST(
      request({
        action: "submit",
        clientText: "The team made the work straightforward.",
        videoUrl: "https://video.example/clip",
        consentName: false,
        consentWebsite: true,
        consentSocial: false,
        approved: true,
      }),
      { params: Promise.resolve({ token }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "testimonial-1" },
      data: expect.objectContaining({
        status: "submitted",
        clientText: "The team made the work straightforward.",
        videoUrl: "https://video.example/clip",
        consentName: false,
        consentWebsite: true,
        consentSocial: false,
      }),
    });
    expect(mocks.publicReviewCreate).not.toHaveBeenCalled();
  });

  it("rejects a locked testimonial", async () => {
    mocks.findUnique.mockResolvedValue({ id: "testimonial-1", status: "published" });
    const response = await POST(
      request({
        action: "submit",
        clientText: "Updated",
        consentName: true,
        approved: true,
      }),
      { params: Promise.resolve({ token }) }
    );
    expect(response.status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
