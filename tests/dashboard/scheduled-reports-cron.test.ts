import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isSmtpConfigured: vi.fn(),
  processScheduledCxReport: vi.fn(),
}));

vi.mock("@/lib/survey-invite-email", () => ({
  isSmtpConfigured: mocks.isSmtpConfigured,
}));

vi.mock("@/lib/scheduled-cx-report", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/scheduled-cx-report")>();
  return {
    ...actual,
    processScheduledCxReport: mocks.processScheduledCxReport,
  };
});

import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/scheduled-reports/[cadence]/route";

describe("GET /api/cron/scheduled-reports/[cadence]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    mocks.isSmtpConfigured.mockReturnValue(true);
    mocks.processScheduledCxReport.mockResolvedValue({
      sent: true,
      skipped: null,
      cadence: "weekly",
      responseCount: 2,
    });
  });

  it("rejects unauthorized cron requests", async () => {
    const response = await GET(
      new NextRequest(
        "https://rsm-voc-platform.vercel.app/api/cron/scheduled-reports/weekly"
      ),
      { params: Promise.resolve({ cadence: "weekly" }) }
    );

    expect(response.status).toBe(401);
    expect(mocks.processScheduledCxReport).not.toHaveBeenCalled();
  });

  it("sends the weekly report when authorized", async () => {
    const response = await GET(
      new NextRequest(
        "https://rsm-voc-platform.vercel.app/api/cron/scheduled-reports/weekly",
        { headers: { authorization: "Bearer test-cron-secret" } }
      ),
      { params: Promise.resolve({ cadence: "weekly" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cadence).toBe("weekly");
    expect(mocks.processScheduledCxReport).toHaveBeenCalledWith("weekly");
  });

  it("rejects an unknown cadence", async () => {
    const response = await GET(
      new NextRequest(
        "https://rsm-voc-platform.vercel.app/api/cron/scheduled-reports/daily",
        { headers: { authorization: "Bearer test-cron-secret" } }
      ),
      { params: Promise.resolve({ cadence: "daily" }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.processScheduledCxReport).not.toHaveBeenCalled();
  });
});
