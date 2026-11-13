import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  isCxAuthError: vi.fn((error: unknown) => error instanceof MockAuthError),
  isCxPermissionError: vi.fn(
    (error: unknown) => error instanceof MockPermissionError
  ),
  loadDashboardAnalyticsItems: vi.fn(),
  buildDashboardAnalyticsContext: vi.fn(),
  embedText: vi.fn(),
  queryRawUnsafe: vi.fn(),
  responseAggregate: vi.fn(),
  responseFindMany: vi.fn(),
  responseInsightFindMany: vi.fn(),
  loadAuthzContext: vi.fn(),
  loadInviteContext: vi.fn(async () => "No matching invites."),
}));

vi.mock("@/lib/authz", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/authz")>()),
  loadAuthzContext: mocks.loadAuthzContext,
}));
vi.mock("@/lib/flags", () => ({ getFlagMode: vi.fn(async () => "off") }));
vi.mock("@/lib/ai/log", () => ({ logAiInteraction: vi.fn() }));

class MockAuthError extends Error {}
class MockPermissionError extends Error {}

vi.mock("@/lib/auth", () => ({
  requirePermission: mocks.requirePermission,
  isCxAuthError: mocks.isCxAuthError,
  isCxPermissionError: mocks.isCxPermissionError,
}));

vi.mock("@/lib/survey/request-security", () => ({
  keyDigest: (value: string) => `digest:${value}`,
  consumeRateLimitForDigest: vi.fn(async () => ({
    allowed: true,
    count: 1,
    limit: 30,
    retryAfterSeconds: 1,
  })),
}));

vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));

vi.mock("@/lib/dashboard-analytics-data", () => ({
  loadDashboardAnalyticsItems: mocks.loadDashboardAnalyticsItems,
  buildDashboardAnalyticsContext: mocks.buildDashboardAnalyticsContext,
}));

vi.mock("@/lib/chat-invite-context", () => ({
  loadInviteTrackerContextForQuestion: mocks.loadInviteContext,
}));

vi.mock("@/lib/insight", () => ({
  embedText: mocks.embedText,
  INSIGHT_MODEL: "gpt-4o",
}));

vi.mock("@/lib/db", () => ({
  db: {
    $queryRawUnsafe: mocks.queryRawUnsafe,
    response: {
      aggregate: mocks.responseAggregate,
      findMany: mocks.responseFindMany,
    },
    responseInsight: {
      findMany: mocks.responseInsightFindMany,
    },
  },
}));

import { POST } from "@/app/api/chat/route";

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({ user: { id: "user-1" } });
    mocks.loadAuthzContext.mockResolvedValue({
      userId: "user-1",
      permissions: ["dashboard.insights"],
      unrestricted: true,
      serviceLineIds: [],
      accountIds: [],
      engagementIds: [],
      staffEmails: [],
    });
    mocks.loadDashboardAnalyticsItems.mockResolvedValue([
      {
        responseId: "response-1",
        submittedAt: "2026-06-12T10:00:00.000Z",
        company: "Acme Holdings",
        clientName: "Jane Doe",
        source: "typed",
        sentiment: "positive",
        metrics: { csat: 5, ces: 6, nps: 10 },
        keyDrivers: ["Responsiveness"],
        riskSignals: [],
        answers: [],
      },
    ]);
    mocks.buildDashboardAnalyticsContext.mockReturnValue(
      "DASHBOARD ANALYTICS (all time, 1 responses in scope):\nCSAT: 5.0/5 average"
    );
    mocks.embedText.mockResolvedValue(Array.from({ length: 1536 }, () => 0));
    mocks.queryRawUnsafe.mockResolvedValue([]);
    mocks.responseInsightFindMany.mockResolvedValue([]);
    delete process.env.OPENAI_API_KEY;
  });

  it("returns a helpful message when OpenAI is not configured", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: "Summarize CSAT for this period",
          window: "all",
        }),
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("OPENAI_API_KEY"),
    });
    expect(mocks.buildDashboardAnalyticsContext).toHaveBeenCalled();
  });

  it("keeps a scoped user's AI context inside their accounts", async () => {
    mocks.loadAuthzContext.mockResolvedValue({
      userId: "user-2",
      permissions: ["dashboard.insights"],
      unrestricted: false,
      serviceLineIds: [],
      accountIds: ["account-a"],
      engagementIds: [],
      staffEmails: [],
    });

    await POST(
      new NextRequest("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "What are clients unhappy about?" }),
      })
    );

    expect(mocks.loadInviteContext).not.toHaveBeenCalled();
    const [, scopeWhere] = mocks.loadDashboardAnalyticsItems.mock.calls[0];
    expect(JSON.stringify(scopeWhere)).toContain("account-a");
    const [sql, , accountIds] = mocks.queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('r."accountId" = ANY($2::text[])');
    expect(accountIds).toEqual(["account-a"]);
  });

  it("rejects unauthenticated chat requests", async () => {
    mocks.requirePermission.mockRejectedValue(new MockAuthError("Unauthorized"));

    const response = await POST(
      new NextRequest("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "What is our NPS?" }),
      })
    );

    expect(response.status).toBe(401);
  });
});
