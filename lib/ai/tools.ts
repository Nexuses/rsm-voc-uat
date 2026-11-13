import { z } from "zod";
import { searchScopedFeedback } from "@/lib/ai/context/feedback";
import type { AiToolDefinition } from "@/lib/ai/provider";
import { accountScopeWhere, can, responseScopeWhere, type AuthzContext } from "@/lib/authz";
import { OPEN_CASE_STATUSES } from "@/lib/cases/state";
import {
  buildDashboardAnalyticsContext,
  loadDashboardAnalyticsItems,
} from "@/lib/dashboard-analytics-data";
import { db } from "@/lib/db";
import { getAccountDetail, listAccounts } from "@/lib/domain/accounts";

export type ToolResult = { data: unknown; sourceIds: string[] };

type ToolSpec = {
  definition: AiToolDefinition;
  args: z.ZodType;
  run: (ctx: AuthzContext, args: never) => Promise<ToolResult>;
};

const windowArg = z.enum(["all", "90d", "year"]).default("all");

// Every tool receives the caller's AuthzContext and applies scope before
// reading. The model never gets SQL, IDs outside scope, or contact fields.
const TOOLS: Record<string, ToolSpec> = {
  get_metrics: {
    definition: {
      name: "get_metrics",
      description:
        "Aggregate CSAT, CES, NPS, sentiment, themes, and trends for the feedback the user may see.",
      parameters: {
        type: "object",
        properties: { window: { type: "string", enum: ["all", "90d", "year"] } },
        additionalProperties: false,
      },
    },
    args: z.object({ window: windowArg }),
    run: async (ctx, args: { window: "all" | "90d" | "year" }) => {
      const items = await loadDashboardAnalyticsItems(args.window, responseScopeWhere(ctx));
      return {
        data: { responses: items.length, report: buildDashboardAnalyticsContext(items, args.window) },
        sourceIds: [],
      };
    },
  },
  list_accounts: {
    definition: {
      name: "list_accounts",
      description: "List client accounts the user may see, with engagement and response counts.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Optional name filter" },
          limit: { type: "integer", minimum: 1, maximum: 50 },
        },
        additionalProperties: false,
      },
    },
    args: z.object({ query: z.string().max(100).optional(), limit: z.number().int().min(1).max(50).default(25) }),
    run: async (ctx, args: { query?: string; limit: number }) => {
      const { accounts } = await listAccounts(ctx, { limit: args.limit, q: args.query });
      return {
        data: accounts.map((account) => ({
          accountId: account.id,
          name: account.name,
          industry: account.industry,
          tier: account.tier,
          engagements: account.engagementCount,
          responses: account.responseCount,
        })),
        sourceIds: [],
      };
    },
  },
  search_feedback: {
    definition: {
      name: "search_feedback",
      description:
        "Semantic search over individual survey responses the user may see. Returns scores, summaries, and quoted comments with responseId for citation.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 12 },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    args: z.object({ query: z.string().trim().min(2).max(500), limit: z.number().int().min(1).max(12).default(8) }),
    run: async (ctx, args: { query: string; limit: number }) => {
      const items = await searchScopedFeedback(ctx, args.query, args.limit);
      return { data: items, sourceIds: items.map((item) => item.responseId) };
    },
  },
  get_account_summary: {
    definition: {
      name: "get_account_summary",
      description: "Engagements, recent scores, open cases, and latest health for one account.",
      parameters: {
        type: "object",
        properties: { accountId: { type: "string" } },
        required: ["accountId"],
        additionalProperties: false,
      },
    },
    args: z.object({ accountId: z.string().min(1).max(64) }),
    run: async (ctx, args: { accountId: string }) => {
      const account = await getAccountDetail(ctx, args.accountId);
      if (!account) return { data: { error: "Account not found or not in your scope" }, sourceIds: [] };
      const [health, openCases] = await Promise.all([
        db.healthSnapshot.findFirst({
          where: { accountId: account.id },
          orderBy: { computedAt: "desc" },
          select: { state: true, score: true, computedAt: true },
        }),
        db.case.count({
          where: {
            status: { in: OPEN_CASE_STATUSES },
            response: { AND: [{ accountId: account.id }, responseScopeWhere(ctx)] },
          },
        }),
      ]);
      const responses = account.responses.slice(0, 20);
      return {
        data: {
          name: account.name,
          industry: account.industry,
          tier: account.tier,
          engagements: account.engagements.map((e) => ({
            name: e.name ?? e.externalEngagementId,
            serviceLine: e.serviceLine,
            status: e.status,
          })),
          recentResponses: responses.map((r) => ({
            responseId: r.id,
            csat: r.csatScore,
            ces: r.cesScore,
            nps: r.npsScore,
            completedAt: r.completedAt,
            designation: r.designation,
          })),
          openCases,
          health,
        },
        sourceIds: responses.map((r) => r.id),
      };
    },
  },
  get_revenue_exposure: {
    definition: {
      name: "get_revenue_exposure",
      description:
        "Revenue for in-scope accounts whose latest health is watch or at_risk. Requires revenue permission.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    args: z.object({}),
    run: async (ctx) => {
      if (!can(ctx, "revenue.read")) {
        return { data: { error: "You do not have permission to view revenue" }, sourceIds: [] };
      }
      const accounts = await db.account.findMany({
        where: accountScopeWhere(ctx),
        select: {
          id: true,
          name: true,
          healthSnapshots: { orderBy: { computedAt: "desc" }, take: 1, select: { state: true } },
          revenueSnapshots: { orderBy: { period: "desc" }, take: 1, select: { period: true, amount: true, currency: true } },
        },
      });
      const exposed = accounts
        .filter((a) => ["watch", "at_risk"].includes(a.healthSnapshots[0]?.state ?? ""))
        .map((a) => ({
          name: a.name,
          health: a.healthSnapshots[0]?.state,
          period: a.revenueSnapshots[0]?.period ?? null,
          amount: a.revenueSnapshots[0]?.amount.toString() ?? null,
          currency: a.revenueSnapshots[0]?.currency ?? null,
        }));
      return { data: exposed, sourceIds: [] };
    },
  },
};

export const AI_TOOL_DEFINITIONS: AiToolDefinition[] = Object.values(TOOLS).map((tool) => tool.definition);

export async function runAiTool(ctx: AuthzContext, name: string, rawArgs: string): Promise<ToolResult> {
  const tool = TOOLS[name];
  if (!tool) return { data: { error: `Unknown tool ${name}` }, sourceIds: [] };
  let json: unknown = {};
  try {
    json = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { data: { error: "Arguments were not valid JSON" }, sourceIds: [] };
  }
  const parsed = tool.args.safeParse(json);
  if (!parsed.success) return { data: { error: "Invalid arguments" }, sourceIds: [] };
  return tool.run(ctx, parsed.data as never);
}
