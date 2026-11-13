import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  loadAuthzContext: vi.fn(),
  loadAnnualCxReportSource: vi.fn(),
  renderAnnualCxReportPdfBuffer: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAnyPermission: mocks.requireAnyPermission,
  isCxAuthError: (error: unknown) =>
    error instanceof Error && error.message === "Unauthorized",
  isCxPermissionError: (error: unknown) =>
    error instanceof Error && error.message.startsWith("Missing permission"),
}));

vi.mock("@/lib/authz", () => ({
  loadAuthzContext: mocks.loadAuthzContext,
}));

vi.mock("@/lib/annual-cx-report-source", () => ({
  loadAnnualCxReportSource: mocks.loadAnnualCxReportSource,
}));

vi.mock("@/lib/annual-cx-report-runner", () => ({
  AnnualCxReportBuildError: class AnnualCxReportBuildError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AnnualCxReportBuildError";
    }
  },
  renderAnnualCxReportPdfBuffer: mocks.renderAnnualCxReportPdfBuffer,
}));

import { POST } from "@/app/api/reports/annual-cx/route";

describe("annual CX PDF route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAnyPermission.mockResolvedValue({ user: { id: "cx-1" } });
    mocks.loadAuthzContext.mockResolvedValue({
      userId: "cx-1",
      permissions: [],
      unrestricted: true,
      serviceLineIds: [],
      accountIds: [],
      engagementIds: [],
      staffEmails: [],
    });
  });

  it("requires overview or reports permission", async () => {
    mocks.requireAnyPermission.mockRejectedValue(
      new Error("Missing permission: dashboard.overview")
    );
    const response = await POST(
      new NextRequest("http://localhost:3000/api/reports/annual-cx", {
        method: "POST",
        body: JSON.stringify({ window: "year" }),
      })
    );
    expect(response.status).toBe(403);
    expect(mocks.loadAnnualCxReportSource).not.toHaveBeenCalled();
  });

  it("returns a PDF attachment for a valid period", async () => {
    mocks.loadAnnualCxReportSource.mockResolvedValue({
      items: [
        {
          responseId: "r1",
          submittedAt: "2026-06-01T10:00:00.000Z",
          company: "Example Co",
          clientName: "Sara",
          source: "typed",
          sentiment: "positive",
          metrics: { csat: 5, ces: 6, nps: 10 },
          keyDrivers: [],
          riskSignals: [],
          answers: [],
        },
      ],
      invites: [
        {
          sentAt: "2026-06-01T09:00:00.000Z",
          openedAt: null,
          startedAt: null,
          completedAt: "2026-06-01T10:00:00.000Z",
          department: null,
          partner: null,
        },
      ],
      quotes: [],
    });
    mocks.renderAnnualCxReportPdfBuffer.mockResolvedValue(
      Buffer.from("%PDF-1.4 placeholder")
    );

    const response = await POST(
      new NextRequest("http://localhost:3000/api/reports/annual-cx", {
        method: "POST",
        body: JSON.stringify({ window: "year" }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /rsm-cx-annual-report-year-/
    );
    expect(mocks.renderAnnualCxReportPdfBuffer).toHaveBeenCalledOnce();
  });
});
