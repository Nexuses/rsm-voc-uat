import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import OpenAI from "openai";
import { z } from "zod";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import {
  buildThemeAttribution,
  finalizeChatAnswer,
  formatThemeAttributionContext,
  sourcesForMentionedThemes,
  toChatSource,
  type ChatSource,
} from "@/lib/chat-sources";
import {
  CHAT_CHART_SYSTEM_INSTRUCTIONS,
  parseChatModelOutput,
  resolveChatCharts,
} from "@/lib/chat-charts";
import { buildDashboardReport } from "@/lib/dashboard-analytics";
import {
  buildDashboardAnalyticsContext,
  loadDashboardAnalyticsItems,
} from "@/lib/dashboard-analytics-data";
import { loadInviteTrackerContextForQuestion } from "@/lib/chat-invite-context";
import { askYourData } from "@/lib/ai/ask";
import { AiNotConfiguredError } from "@/lib/ai/provider";
import { logAiInteraction } from "@/lib/ai/log";
import { ContactAliaser } from "@/lib/ai/minimize";
import { responseScopeSql } from "@/lib/ai/scope-sql";
import { writeAuditLog } from "@/lib/audit";
import { can, loadAuthzContext, responseScopeWhere } from "@/lib/authz";
import { db } from "@/lib/db";
import { getFlagMode } from "@/lib/flags";
import {
  consumeRateLimitForDigest,
  keyDigest,
} from "@/lib/survey/request-security";
import { embedText, INSIGHT_MODEL } from "@/lib/insight";
import { resolveOverallSentiment } from "@/lib/survey/metrics";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";

export const runtime = "nodejs";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(2_000),
  window: z.enum(["all", "90d", "year"]).optional(),
});

const lowestRatingPattern =
  /\b(lowest|worst|minimum|least satisfied|least happy)\b/i;

const themeQuestionPattern =
  /\b(theme|driver|topics?|showing up|mentioned|most often)\b/i;

let openai: OpenAI | undefined;

type RetrievedInsight = Prisma.ResponseInsightGetPayload<{
  include: { response: { include: { client: true } } };
}>;

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  openai ??= new OpenAI({ apiKey, timeout: 60_000, maxRetries: 1 });
  return openai;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function buildContext(insights: RetrievedInsight[]) {
  return insights
    .map((insight) => {
      const client = insight.response.client;
      const respondent = toChatSource(insight.response);
      const answers = normalizeContextAnswers(insight.response.answers);
      return [
        `RESPONSE ${insight.responseId}`,
        `Respondent: ${respondent.label}${
          client?.designation ? ` [designation: ${client.designation}]` : ""
        }${client?.tier ? ` [tier: ${client.tier}]` : ""}`,
        `Survey version: ${insight.response.surveyVersion}`,
        `CSAT: ${formatScore(insight.response.csatScore, 5)}`,
        `CES: ${formatScore(insight.response.cesScore, 7)}`,
        `NPS response: ${formatScore(insight.response.npsScore, 10)}`,
        ...answers,
        `Sentiment: ${
          resolveOverallSentiment({
            csatScore: insight.response.csatScore,
            cesScore: insight.response.cesScore,
            npsScore: insight.response.npsScore,
            storedSentiment: insight.overallSentiment,
          }) ?? insight.overallSentiment
        }`,
        `Summary: ${insight.satisfactionSummary}`,
        `Drivers: ${stringList(insight.keyDrivers).join(", ") || "none"}`,
        `Risks: ${stringList(insight.riskSignals).join(", ") || "none"}`,
      ].join("\n");
    })
    .join("\n\n");
}

function normalizeContextAnswers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((answer) => {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
      return [];
    }
    const record = answer as Record<string, unknown>;
    if (typeof record.rating !== "number") return [];
    const metric =
      typeof record.metric === "string"
        ? record.metric.toUpperCase()
        : `Q${record.question_number ?? "?"}`;
    const scaleMax =
      typeof record.scale_max === "number" ? record.scale_max : 5;
    const comment =
      typeof record.reason_text === "string" && record.reason_text.trim()
        ? `; comment: ${record.reason_text.trim()}`
        : "";
    return [`${metric} answer: ${record.rating}/${scaleMax}${comment}`];
  });
}

function formatScore(value: number | null, max: number) {
  return value === null ? "missing" : `${value}/${max}`;
}

function uniqueSources(sources: ChatSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.responseId)) return false;
    seen.add(source.responseId);
    return true;
  });
}

function sourcesForLowestResponses(
  lowestIds: string[],
  sourcesById: Map<string, ChatSource>
) {
  return uniqueSources(
    lowestIds.flatMap((id) => {
      const source = sourcesById.get(id);
      return source ? [source] : [];
    })
  );
}

function isOpenAiConfigError(error: unknown) {
  return (
    error instanceof AiNotConfiguredError ||
    (error instanceof Error && /OPENAI_API_KEY is not configured/i.test(error.message))
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("dashboard.insights");

    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "A question is required" },
        { status: 400 }
      );
    }

    const chatLimit = await consumeRateLimitForDigest(
      keyDigest(`chat:${session.user.id}`),
      "chat"
    );
    if (!chatLimit.allowed) {
      return NextResponse.json(
        { error: "Too many questions. Try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(chatLimit.retryAfterSeconds) },
        }
      );
    }
    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "ai.chat_query",
      metadata: {
        window: parsed.data.window ?? "all",
        questionLength: parsed.data.question.length,
      },
      source: "api",
    });

    const question = parsed.data.question;
    const window = parsed.data.window ?? "all";
    const ctx = await loadAuthzContext(session);
    const scopeWhere = responseScopeWhere(ctx);

    if ((await getFlagMode("ai.ask_your_data_tools")) === "live") {
      const result = await askYourData({ ctx, question });
      const cited = result.citations.length
        ? await db.response.findMany({
            where: { AND: [{ id: { in: result.citations } }, scopeWhere] },
            select: {
              id: true,
              completedAt: true,
              createdAt: true,
              client: { select: { name: true, company: true } },
            },
          })
        : [];
      return NextResponse.json({
        answer: result.answer,
        charts: [],
        sources: cited.map(toChatSource),
        toolTrace: result.toolTrace,
      });
    }

    const startedAt = Date.now();
    const aliaser = new ContactAliaser();
    const analyticsItems = await loadDashboardAnalyticsItems(window, scopeWhere);
    const analyticsContext = buildDashboardAnalyticsContext(
      analyticsItems,
      window
    );
    const themeAttribution = buildThemeAttribution(analyticsItems);
    const themeAttributionContext =
      formatThemeAttributionContext(themeAttribution);
    // Invite tracker context is organization-wide, so scoped users never get it.
    const inviteContext = ctx.unrestricted
      ? await loadInviteTrackerContextForQuestion(question)
      : "Not available for users with a restricted data scope.";
    const questionVector = await embedText(question);
    const vectorLiteral = `[${questionVector.join(",")}]`;
    const scopeSql = responseScopeSql(ctx, 2);
    const semanticRows = await db.$queryRawUnsafe<
      Array<{ responseId: string; distance: number }>
    >(
      `SELECT e."responseId", e.embedding <=> $1::vector AS distance
       FROM "ResponseEmbedding" e
       JOIN "Response" r ON r.id = e."responseId"
       WHERE r."excludedAt" IS NULL ${scopeSql.clause}
       ORDER BY distance ASC
       LIMIT 8`,
      vectorLiteral,
      ...scopeSql.params
    );

    let lowestIds: string[] = [];
    if (lowestRatingPattern.test(question)) {
      const minimum = await db.response.aggregate({
        where: {
          AND: [
            { excludedAt: null, avgRating: { not: null }, insight: { isNot: null } },
            scopeWhere,
          ],
        },
        _min: { avgRating: true },
      });
      if (minimum._min.avgRating !== null) {
        const lowest = await db.response.findMany({
          where: {
            AND: [
              {
                excludedAt: null,
                avgRating: minimum._min.avgRating,
                insight: { isNot: null },
              },
              scopeWhere,
            ],
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
          take: 20,
        });
        lowestIds = lowest.map((response) => response.id);
      }
    }

    const orderedIds = [
      ...new Set([
        ...lowestIds,
        ...semanticRows.map((row) => row.responseId),
      ]),
    ];
    if (orderedIds.length === 0 && analyticsItems.length === 0) {
      return NextResponse.json({
        answer: "There is no feedback available to answer that question.",
        charts: [],
        sources: [],
      });
    }

    const matches =
      orderedIds.length > 0
        ? await db.responseInsight.findMany({
            where: {
              responseId: { in: orderedIds },
              response: { AND: [{ excludedAt: null }, scopeWhere] },
            },
            include: { response: { include: { client: true } } },
          })
        : [];
    const byResponseId = new Map(
      matches.map((insight) => [insight.responseId, insight])
    );
    const insights = orderedIds.flatMap((id) => {
      const insight = byResponseId.get(id);
      return insight ? [insight] : [];
    });
    const sourcesById = new Map(
      insights.map((insight) => [
        insight.responseId,
        toChatSource(insight.response),
      ])
    );

    const completion = await getOpenAI().chat.completions.create({
      model: INSIGHT_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are the CX feedback analyst for RSM in Kuwait.
Use the dashboard analytics summary for questions about overall CSAT, CES, NPS,
distributions, trends, sentiment mix, themes, voice share, and risk counts.
Use the theme attribution section to name the companies behind each theme.
Use the invite tracker context for questions about invitation totals, overall
outreach status, response rate, whether a client opened or completed a survey,
follow-ups, non-openers, non-responders, and the linked CSAT/CES/NPS feedback or
comments for a specific email or client when that feedback is present in the
invite tracker context. Prefer the outreach summary counts for “how many”
questions.
Use the individual response context for client-specific questions, comments,
drivers, risks, and follow-up actions. When citing a specific response, use
[source: <company or respondent name>] rather than database IDs. When answering
from analytics or invite tracker only, you do not need inline citations unless
you also reference specific responses. If neither source contains the answer,
say so. Do not invent client details, feedback, survey questions, or actions
already taken.

${CHAT_CHART_SYSTEM_INSTRUCTIONS}`,
        },
        {
          role: "user",
          content: aliaser.redact(
            `${analyticsContext}${
              themeAttributionContext ? `\n\n${themeAttributionContext}` : ""
            }\n\nInvite tracker context:\n${inviteContext}\n\nIndividual response context:\n${buildContext(insights)}\n\nQuestion: ${question}`
          ),
        },
      ],
    });
    await logAiInteraction({
      purpose: "chat_legacy",
      provider: "openai",
      model: INSIGHT_MODEL,
      promptVersion: "chat-legacy@1",
      actorUserId: session.user.id,
      inputTokens: completion.usage?.prompt_tokens ?? null,
      outputTokens: completion.usage?.completion_tokens ?? null,
      latencyMs: Date.now() - startedAt,
      status: "ok",
      sourceIds: insights.map((insight) => insight.responseId),
    });

    const rawContent =
      completion.choices[0]?.message?.content?.trim() ||
      '{"answer":"The available feedback did not produce an answer.","charts":[]}';
    const parsedOutput = parseChatModelOutput(rawContent);
    const modelAnswer = can(ctx, "dashboard.responses")
      ? aliaser.rehydrate(parsedOutput.answer)
      : parsedOutput.answer;
    const modelCharts = parsedOutput.charts;
    const report = buildDashboardReport(analyticsItems);
    const charts = resolveChatCharts(question, report, modelCharts);
    const appendSources =
      lowestIds.length > 0
        ? sourcesForLowestResponses(lowestIds, sourcesById)
        : themeQuestionPattern.test(question)
          ? sourcesForMentionedThemes(
              modelAnswer,
              themeAttribution,
              analyticsItems
            )
          : [];

    const { answer, footerSources } = finalizeChatAnswer(
      modelAnswer,
      sourcesById,
      appendSources
    );

    return NextResponse.json({
      answer,
      charts,
      sources: footerSources,
    });
  } catch (error) {
    if (isCxAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isCxPermissionError(error)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isOpenAiConfigError(error)) {
      return NextResponse.json(
        {
          error:
            "OpenAI is not configured yet. Add OPENAI_API_KEY to .env.local and restart the dev server.",
        },
        { status: 503 }
      );
    }
    if (isTransientPrismaError(error)) {
      return databaseUnavailableResponse();
    }
    throw error;
  }
}
