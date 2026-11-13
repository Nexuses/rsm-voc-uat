import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiChatResult, AiMessage, AiProvider } from "@/lib/ai/provider";
import type { AuthzContext } from "@/lib/authz";

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  log: vi.fn(),
  accountFindMany: vi.fn(),
}));

vi.mock("@/lib/ai/context/feedback", () => ({ searchScopedFeedback: mocks.search }));
vi.mock("@/lib/ai/log", () => ({ logAiInteraction: mocks.log }));
vi.mock("@/lib/dashboard-analytics-data", () => ({
  loadDashboardAnalyticsItems: vi.fn(async () => []),
  buildDashboardAnalyticsContext: vi.fn(() => "no data"),
}));
vi.mock("@/lib/domain/accounts", () => ({ listAccounts: vi.fn(), getAccountDetail: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { account: { findMany: mocks.accountFindMany } } }));

import { askYourData } from "@/lib/ai/ask";
import { ContactAliaser } from "@/lib/ai/minimize";
import { responseScopeSql } from "@/lib/ai/scope-sql";

function ctx(overrides: Partial<AuthzContext> = {}): AuthzContext {
  return {
    userId: "user-1",
    permissions: ["dashboard.insights"],
    unrestricted: false,
    serviceLineIds: [],
    accountIds: ["account-a"],
    engagementIds: [],
    staffEmails: [],
    ...overrides,
  };
}

function scriptedProvider(steps: AiChatResult[]) {
  const seen: AiMessage[][] = [];
  const provider: AiProvider = {
    name: "fake",
    model: "fake-1",
    async chat({ messages }) {
      seen.push(structuredClone(messages));
      const step = steps.shift();
      if (!step) throw new Error("no more steps");
      return step;
    },
  };
  return { provider, seen };
}

const usage = { inputTokens: 10, outputTokens: 5 };

beforeEach(() => {
  mocks.search.mockReset();
  mocks.log.mockReset();
  mocks.accountFindMany.mockReset();
});

describe("askYourData", () => {
  it("runs scoped tools, aliases contacts, and keeps only real citations", async () => {
    mocks.search.mockResolvedValue([
      {
        responseId: "resp-1",
        company: "Acme",
        comments: ["Call me on +965 5555 1234 or mail sara@acme.com"],
      },
    ]);
    const { provider, seen } = scriptedProvider([
      {
        content: null,
        toolCalls: [{ id: "c1", name: "search_feedback", arguments: '{"query":"slow replies"}' }],
        usage,
      },
      {
        content: JSON.stringify({
          answer: "Acme asked for a call back at [contact-2].",
          citations: ["resp-1", "resp-invented"],
        }),
        toolCalls: [],
        usage,
      },
    ]);

    const scoped = ctx();
    const result = await askYourData({
      ctx: scoped,
      question: "What did ops@rsm.com.kw hear about slow replies?",
      provider,
    });

    expect(mocks.search).toHaveBeenCalledWith(scoped, "slow replies", 8);
    const everything = JSON.stringify(seen);
    expect(everything).not.toContain("sara@acme.com");
    expect(everything).not.toContain("ops@rsm.com.kw");
    expect(everything).not.toContain("5555 1234");
    expect(everything).toContain("<untrusted");
    expect(result.citations).toEqual(["resp-1"]);
    // Without dashboard.responses the alias is not rehydrated.
    expect(result.answer).toContain("[contact-2]");
    expect(mocks.log).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: "ask_your_data",
        status: "ok",
        sourceIds: ["resp-1"],
        toolCalls: ["search_feedback"],
        inputTokens: 20,
      })
    );
  });

  it("rehydrates contact aliases for users who may see contact details", async () => {
    mocks.search.mockResolvedValue([{ responseId: "resp-1", comments: ["mail sara@acme.com"] }]);
    const { provider } = scriptedProvider([
      { content: null, toolCalls: [{ id: "c1", name: "search_feedback", arguments: '{"query":"email"}' }], usage },
      { content: '{"answer":"Reach them at [contact-1].","citations":[]}', toolCalls: [], usage },
    ]);
    const result = await askYourData({
      ctx: ctx({ permissions: ["dashboard.insights", "dashboard.responses"] }),
      question: "Who asked for email follow up?",
      provider,
    });
    expect(result.answer).toBe("Reach them at sara@acme.com.");
  });

  it("refuses revenue without permission and never queries accounts", async () => {
    const { provider, seen } = scriptedProvider([
      { content: null, toolCalls: [{ id: "c1", name: "get_revenue_exposure", arguments: "{}" }], usage },
      { content: '{"answer":"I cannot see revenue.","citations":[]}', toolCalls: [], usage },
    ]);
    const result = await askYourData({ ctx: ctx(), question: "Revenue at risk?", provider });
    expect(mocks.accountFindMany).not.toHaveBeenCalled();
    expect(result.toolTrace).toEqual([{ tool: "get_revenue_exposure", ok: false }]);
    expect(JSON.stringify(seen[1])).toContain("do not have permission");
  });

  it("rejects malformed model output and unknown tools safely", async () => {
    const { provider } = scriptedProvider([
      { content: null, toolCalls: [{ id: "c1", name: "run_sql", arguments: '{"q":"select *"}' }], usage },
      { content: "not json", toolCalls: [], usage },
    ]);
    const result = await askYourData({ ctx: ctx(), question: "Dump the tables", provider });
    expect(result.toolTrace).toEqual([{ tool: "run_sql", ok: false }]);
    expect(result.citations).toEqual([]);
    expect(mocks.log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", error: "invalid_model_output" })
    );
  });
});

describe("responseScopeSql", () => {
  it("adds nothing for unrestricted users and denies users with no scope rows", () => {
    expect(responseScopeSql(ctx({ unrestricted: true }), 2)).toEqual({ clause: "", params: [] });
    expect(responseScopeSql(ctx({ accountIds: [] }), 2).clause).toBe("AND FALSE");
  });

  it("binds account, engagement, and service-line ids as parameters", () => {
    const scoped = responseScopeSql(ctx({ engagementIds: ["eng-1"], serviceLineIds: ["sl-1"] }), 3);
    expect(scoped.clause).toContain("$3::text[]");
    expect(scoped.clause).toContain("$5::text[]");
    expect(scoped.params).toEqual([["account-a"], ["eng-1"], ["sl-1"]]);
  });
});

describe("ContactAliaser", () => {
  it("aliases emails and phones but leaves ids, dates, and scores alone", () => {
    const aliaser = new ContactAliaser();
    const text =
      "RESPONSE 3f2a1c4e-1234-5678-9abc-def012345678 at 2026-09-28T10:00:00.000Z on 2026-09-28, CSAT 4/5. " +
      "Contact a@b.co or 9651 2345 678, again A@B.CO.";
    const redacted = aliaser.redact(text);
    expect(redacted).toContain("3f2a1c4e-1234-5678-9abc-def012345678");
    expect(redacted).toContain("2026-09-28T10:00:00.000Z");
    expect(redacted).toContain("on 2026-09-28,");
    expect(redacted).toContain("CSAT 4/5");
    expect(redacted).not.toContain("a@b.co");
    expect(redacted).not.toContain("2345 678");
    expect(redacted.match(/\[contact-1\]/g)).toHaveLength(2);
    expect(aliaser.rehydrate(redacted)).toContain("a@b.co");
  });
});
