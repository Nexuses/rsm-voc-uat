import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  loadAuthzContext: vi.fn(),
  loadAnnualCxReportSource: vi.fn(),
  renderCxReportPdfBuffer: vi.fn(),
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

import { POST } from "@/app/api/reports/metric-cx/route";

describe("metric CX PDF route", () => {
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

  it("returns a CSAT PDF for a valid period", async () => {
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
    mocks.renderCxReportPdfBuffer.mockResolvedValue(
      Buffer.from("%PDF-1.4 placeholder")
    );

    const response = await POST(
      new NextRequest("http://localhost:3000/api/reports/metric-cx", {
        method: "POST",
        body: JSON.stringify({ metric: "csat", window: "year" }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /rsm-csat-report-year-/
    );
    expect(mocks.renderCxReportPdfBuffer).toHaveBeenCalledWith(
      expect.any(Object),
      "csat"
    );
  });

  it("rejects requests without a metric", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/reports/metric-cx", {
        method: "POST",
        body: JSON.stringify({ window: "year" }),
      })
    );
    expect(response.status).toBe(400);
    expect(mocks.renderCxReportPdfBuffer).not.toHaveBeenCalled();
  });

  it("scopes the PDF period to dateFrom/dateTo filters", async () => {
    mocks.loadAnnualCxReportSource.mockResolvedValue({
      items: [
        {
          responseId: "r1",
          submittedAt: "2026-10-15T10:00:00.000Z",
          company: "Example Co",
          clientName: "Sara",
          source: "typed",
          sentiment: "positive",
          metrics: { csat: 5, ces: 6, nps: 10 },
          keyDrivers: [],
          riskSignals: [],
          answers: [],
        },
        {
          responseId: "r2",
          submittedAt: "2026-06-01T10:00:00.000Z",
          company: "Other Co",
          clientName: "Omar",
          source: "typed",
          sentiment: "positive",
          metrics: { csat: 4, ces: 5, nps: 8 },
          keyDrivers: [],
          riskSignals: [],
          answers: [],
        },
      ],
      invites: [],
      quotes: [],
    });
    mocks.renderCxReportPdfBuffer.mockResolvedValue(
      Buffer.from("%PDF-1.4 placeholder")
    );

    const response = await POST(
      new NextRequest("http://localhost:3000/api/reports/metric-cx", {
        method: "POST",
        body: JSON.stringify({
          metric: "nps",
          window: "all",
          dateFrom: "2026-10-01",
          dateTo: "2026-10-31",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toMatch(
      /rsm-nps-report-2026-10-01_to_2026-10-31-/
    );
    const data = mocks.renderCxReportPdfBuffer.mock.calls[0]?.[0] as {
      period: { start_date: string; end_date: string };
      responses: { received: number };
    };
    expect(data.period).toEqual({
      start_date: "2026-10-01",
      end_date: "2026-10-31",
    });
    expect(data.responses.received).toBe(1);
  });
});
