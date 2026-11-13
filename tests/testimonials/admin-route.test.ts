import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requirePermission: mocks.requirePermission,
  isCxAuthError: (error: unknown) =>
    error instanceof Error && error.message === "Unauthorized",
  isCxPermissionError: (error: unknown) =>
    error instanceof Error && error.message.startsWith("Missing permission"),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testimonial: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
    auditLog: { create: mocks.auditCreate },
  },
}));

import { GET } from "@/app/api/testimonials/route";
import { PATCH } from "@/app/api/testimonials/[id]/route";

describe("testimonial admin routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auditCreate.mockResolvedValue({});
    mocks.update.mockResolvedValue({});
  });

  it("requires testimonials.manage to list rows", async () => {
    mocks.requirePermission.mockRejectedValue(
      new Error("Missing permission: testimonials.manage")
    );
    const response = await GET(new NextRequest("http://localhost:3000/api/testimonials"));
    expect(response.status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith("testimonials.manage");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("lists testimonials for an admin", async () => {
    mocks.requirePermission.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.findMany.mockResolvedValue([
      {
        id: "testimonial-1",
        createdAt: new Date("2026-10-19T08:00:00.000Z"),
        requestedAt: new Date("2026-10-19T08:00:00.000Z"),
        submittedAt: new Date("2026-10-19T09:00:00.000Z"),
        publishedAt: null,
        kind: "draft_approval",
        status: "submitted",
        source: "survey_thankyou",
        clientText: "Clear advice.",
        aiDraft: "Draft that should not replace the client text.",
        videoUrl: null,
        token: "secret-token",
        consentName: true,
        consentWebsite: true,
        consentSocial: false,
        response: {
          csatScore: 5,
          cesScore: 6,
          npsScore: 9,
          completedAt: new Date("2026-10-19T07:00:00.000Z"),
          client: { name: "Sara Al-Sabah", company: "Example Co", email: "sara@example.com" },
        },
        surveyInvite: {
          email: "sara@example.com",
          customerName: "Sara Al-Sabah",
          firstName: "Sara",
          lastName: "Al-Sabah",
          company: "Example Co",
        },
      },
    ]);

    const response = await GET(new NextRequest("http://localhost:3000/api/testimonials"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.testimonials[0].publishableQuote).toContain("Sara Al-Sabah");
    expect(body.testimonials[0].email).toBe("sara@example.com");
    expect(body.testimonials[0].reviewPath).toBe("/testimonial/secret-token");
  });

  it("publishes only a consented submission", async () => {
    mocks.requirePermission.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.findUnique.mockResolvedValue({
      id: "testimonial-1",
      status: "requested",
      consentedAt: null,
    });

    const denied = await PATCH(
      new NextRequest("http://localhost:3000/api/testimonials/testimonial-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "publish" }),
      }),
      { params: Promise.resolve({ id: "testimonial-1" }) }
    );
    expect(denied.status).toBe(409);

    mocks.findUnique.mockResolvedValue({
      id: "testimonial-1",
      status: "submitted",
      consentedAt: new Date(),
    });
    const allowed = await PATCH(
      new NextRequest("http://localhost:3000/api/testimonials/testimonial-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      }),
      { params: Promise.resolve({ id: "testimonial-1" }) }
    );
    expect(allowed.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "published",
          publishedByUserId: "admin-1",
        }),
      })
    );
  });
});
