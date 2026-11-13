import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isSmtpConfigured: vi.fn(),
  processDueSurveyFollowups: vi.fn(),
}));

vi.mock("@/lib/survey-invite-email", () => ({
  isSmtpConfigured: mocks.isSmtpConfigured,
}));

vi.mock("@/lib/survey-invite-tracking", () => ({
  processDueSurveyFollowups: mocks.processDueSurveyFollowups,
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/survey-followups/route";

describe("GET /api/cron/survey-followups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    mocks.isSmtpConfigured.mockReturnValue(true);
    mocks.processDueSurveyFollowups.mockResolvedValue({
      sent: 3,
      skipped: 0,
      failed: 0,
      checked: 3,
    });
  });

  it("rejects unauthorized cron requests", async () => {
    const response = await GET(
      new NextRequest("https://rsm-voc-platform.vercel.app/api/cron/survey-followups")
    );

    expect(response.status).toBe(401);
    expect(mocks.processDueSurveyFollowups).not.toHaveBeenCalled();
  });

  it("processes due follow-ups when authorized", async () => {
    const response = await GET(
      new NextRequest("https://rsm-voc-platform.vercel.app/api/cron/survey-followups", {
        headers: { authorization: "Bearer test-cron-secret" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sent).toBe(3);
    expect(mocks.processDueSurveyFollowups).toHaveBeenCalled();
  });
});
