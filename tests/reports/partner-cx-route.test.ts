import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The partner report is a three-page deck covering CSAT, NPS and CES together.
 * A partner can hold responses but no scores for one of the measures; that
 * payload used to reach the Python builder, divide by a zero CES total while
 * writing the page-3 narrative, and surface a raw traceback in the dashboard.
 * The route now answers 422 naming the empty measure, before any build runs.
 *
 * The builder itself is zero-safe too (verified by rendering every report type
 * against all-zero fixtures); this keeps a misleading "0%" deck from shipping.
 */
const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  loadAuthzContext: vi.fn(),
  loadAnnualCxReportSource: vi.fn(),
  buildPartnerCxReportDataJson: vi.fn(),
  renderCxReportPdfBuffer: vi.fn(),
  lookupStaffContactEmail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAnyPermission: mocks.requireAnyPermission,
}));

vi.mock("@/lib/authz", () => ({
  loadAuthzContext: mocks.loadAuthzContext,
}));

vi.mock("@/lib/annual-cx-report-source", () => ({
  loadAnnualCxReportSource: mocks.loadAnnualCxReportSource,
}));

vi.mock("@/lib/annual-cx-report-payload", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/annual-cx-report-payload")>();
  return {
    ...actual,
    buildPartnerCxReportDataJson: mocks.buildPartnerCxReportDataJson,
  };
});

vi.mock("@/lib/annual-cx-report-runner", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/annual-cx-report-runner")>();
  return {
    ...actual,
    renderCxReportPdfBuffer: mocks.renderCxReportPdfBuffer,
  };
});

vi.mock("@/lib/survey-staff-contacts", () => ({
  lookupStaffContactEmail: mocks.lookupStaffContactEmail,
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/reports/partner-cx/route";

function request() {
  return new NextRequest(
    "https://rsm-voc-platform.vercel.app/api/reports/partner-cx",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ window: "90d", partner: "Acme Holding" }),
    }
  );
}

function payload(overrides: { csat?: number; nps?: number; ces?: number; received?: number }) {
  const { csat = 5, nps = 6, ces = 5, received = 10 } = overrides;
  return {
    period: { start_date: "2026-09-01", end_date: "2026-09-30" },
    partner: { name: "Acme Holding" },
    responses: { surveys_sent: 40, received, prev_received: 0 },
    csat: {
      very_satisfied: csat,
      satisfied: 0,
      neutral: 0,
      dissatisfied: 0,
      prev_pct: 0,
      target_pct: 80,
    },
    nps: { promoters: nps, neutral: 0, detractors: 0, prev_score: 0, target: 50 },
    ces: {
      rating_1: 0,
      rating_2: 0,
      rating_3: 0,
      rating_4: 0,
      rating_5: 0,
      rating_6: 0,
      rating_7: ces,
      prev_score: 0,
      target: 5.5,
    },
    testimonials: [],
    text_overrides: {},
  };
}

function stubPayload(data: ReturnType<typeof payload>) {
  mocks.buildPartnerCxReportDataJson.mockReturnValue(data);
}

describe("POST /api/reports/partner-cx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAnyPermission.mockResolvedValue({ user: { id: "user-1" } });
    mocks.loadAuthzContext.mockResolvedValue({});
    mocks.loadAnnualCxReportSource.mockResolvedValue({
      items: [{ partner: "Acme Holding" }],
      invites: [],
      quotes: [],
    });
    mocks.lookupStaffContactEmail.mockResolvedValue(null);
    mocks.renderCxReportPdfBuffer.mockResolvedValue(Buffer.from("%PDF-1.7"));
  });

  it("rejects a partner with no responses at all", async () => {
    stubPayload(payload({ received: 0 }));

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toMatch(/No responses for Acme Holding/);
    expect(mocks.renderCxReportPdfBuffer).not.toHaveBeenCalled();
  });

  it("names the measure with no scores instead of building a broken PDF", async () => {
    stubPayload(payload({ ces: 0 }));

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toContain("CES");
    expect(body.error).toContain("Acme Holding");
    expect(body.error).not.toMatch(/Traceback|\.py/);
    expect(mocks.renderCxReportPdfBuffer).not.toHaveBeenCalled();
  });

  it("lists every empty measure", async () => {
    stubPayload(payload({ csat: 0, ces: 0 }));

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toContain("CSAT or CES");
  });

  it("builds the deck when all three measures have scores", async () => {
    stubPayload(payload({}));

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(mocks.renderCxReportPdfBuffer).toHaveBeenCalledWith(
      expect.objectContaining({ responses: expect.any(Object) }),
      "partner"
    );
  });
});
