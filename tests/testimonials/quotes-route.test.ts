import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  findMany: vi.fn(),
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
    },
  },
}));

import { GET } from "@/app/api/testimonials/quotes/route";

describe("testimonial quotes route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires dashboard.overview", async () => {
    mocks.requirePermission.mockRejectedValue(
      new Error("Missing permission: dashboard.overview")
    );
    const response = await GET();
    expect(response.status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith("dashboard.overview");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("returns published quotes without contact fields", async () => {
    mocks.requirePermission.mockResolvedValue({ user: { id: "cx-1" } });
    mocks.findMany.mockResolvedValue([
      {
        id: "t1",
        clientText: "Clear advice throughout.",
        aiDraft: "Ignored when client text exists",
        consentName: true,
        response: {
          client: { name: "Sara Al-Sabah", company: "Example Co" },
        },
        surveyInvite: {
          customerName: "Sara Al-Sabah",
          firstName: "Sara",
          lastName: "Al-Sabah",
          company: "Example Co",
        },
      },
      {
        id: "t2",
        clientText: null,
        aiDraft: "Draft only quote",
        consentName: false,
        response: { client: { name: "Hidden", company: "Quiet Co" } },
        surveyInvite: null,
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.quotes).toHaveLength(2);
    expect(payload.quotes[0]).toEqual({
      id: "t1",
      text: "Clear advice throughout.",
      respondentName: "Sara Al-Sabah",
      company: "Example Co",
      showAttribution: true,
      metric: null,
    });
    expect(payload.quotes[1].showAttribution).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("@");
  });
});
