import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  loadAuthzContext: vi.fn(),
  loadAnnualCxReportSource: vi.fn(),
  renderCxReportPdfBuffer: vi.fn(),
  lookupStaffContactEmail: vi.fn(),
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
  renderCxReportPdfBuffer: mocks.renderCxReportPdfBuffer,
}));

vi.mock("@/lib/survey-staff-contacts", () => ({
  lookupStaffContactEmail: mocks.lookupStaffContactEmail,
}));

import { POST } from "@/app/api/reports/partner-cx/route";

function baseItem(overrides: Record<string, unknown> = {}) {
  return {
    responseId: "r1",
    submittedAt: "2026-10-15T10:00:00.000Z",
    company: "Example Co",
    clientName: "Sara",
    source: "typed",
    sentiment: "positive",
    metrics: { csat: 5, ces: 6, nps: 10 },
    keyDrivers: ["Clear communication"],
    riskSignals: [],
    answers: [],
    partner: "Jane Partner",
    ...overrides,
  };
}

describe("partner CX PDF route", () => {
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
    mocks.lookupStaffContactEmail.mockResolvedValue(null);
    mocks.renderCxReportPdfBuffer.mockResolvedValue(
      Buffer.from("%PDF-1.4 placeholder")
    );
  });

  it("requires overview or reports permission", async () => {
    mocks.requireAnyPermission.mockRejectedValue(
      new Error("Missing permission: dashboard.overview")
    );
    const response = await POST(
      new NextRequest("http://localhost:3000/api/reports/partner-cx", {
        method: "POST",
        body: JSON.stringify({ window: "90d" }),
      })
    );
    expect(response.status).toBe(403);
    expect(mocks.loadAnnualCxReportSource).not.toHaveBeenCalled();
  });

  it("rejects when no single partner can be resolved", async () => {
    mocks.loadAnnualCxReportSource.mockResolvedValue({
      items: [baseItem({ partner: "Jane Partner" }), baseItem({ partner: "Other Partner" })],
      invites: [],
      quotes: [],
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/reports/partner-cx", {
        method: "POST",
        body: JSON.stringify({ window: "all" }),
      })
    );
    expect(response.status).toBe(422);
    expect(mocks.renderCxReportPdfBuffer).not.toHaveBeenCalled();
  });

  it("builds a partner PDF when exactly one partner is in scope", async () => {
    mocks.loadAnnualCxReportSource.mockResolvedValue({
      items: [baseItem(), baseItem({ responseId: "r2" })],
      invites: [],
      quotes: [],
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/reports/partner-cx", {
        method: "POST",
        body: JSON.stringify({ window: "all" }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /rsm-partner-report-jane-partner-/
    );
    expect(mocks.renderCxReportPdfBuffer).toHaveBeenCalledOnce();
    const [data, kind] = mocks.renderCxReportPdfBuffer.mock.calls[0]!;
    expect(kind).toBe("partner");
    expect((data as { partner: { name: string } }).partner.name).toBe(
      "Jane Partner"
    );
  });

  it("uses the filter-selected partner even with multiple partners in scope", async () => {
    mocks.loadAnnualCxReportSource.mockResolvedValue({
      items: [
        baseItem({ partner: "Jane Partner" }),
        baseItem({ responseId: "r2", partner: "Other Partner" }),
      ],
      invites: [],
      quotes: [],
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/reports/partner-cx", {
        method: "POST",
        body: JSON.stringify({ window: "all", partner: "Jane Partner" }),
      })
    );

    expect(response.status).toBe(200);
    const [data] = mocks.renderCxReportPdfBuffer.mock.calls[0]!;
    expect((data as { partner: { name: string } }).partner.name).toBe(
      "Jane Partner"
    );
    expect((data as { responses: { received: number } }).responses.received).toBe(
      1
    );
  });
});
