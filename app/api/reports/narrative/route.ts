import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AiNotConfiguredError } from "@/lib/ai/provider";
import { generateCxReportNarrative } from "@/lib/ai/cx-report-narrative";
import { loadAuthzContext, responseScopeWhere } from "@/lib/authz";
import { requirePermission } from "@/lib/auth";
import { routeErrorResponse } from "@/lib/api/errors";
import {
  filterItemsForAnnualRange,
  resolveAnnualCxPeriodPlan,
} from "@/lib/annual-cx-report-period";
import { emptyDashboardOrgFilters } from "@/lib/dashboard-report-filters";
import type { DashboardAnalyticsItem } from "@/lib/dashboard-analytics";
import { getResponseSource } from "@/lib/cx-response-select";
import { db } from "@/lib/db";
import { resolveOverallSentiment } from "@/lib/survey/metrics";

const bodySchema = z.object({
  window: z.enum(["all", "90d", "year"]).default("all"),
  department: z.string().optional().default(""),
  partner: z.string().optional().default(""),
  service: z.string().optional().default(""),
  businessManager: z.string().optional().default(""),
  jobManager: z.string().optional().default(""),
  dateFrom: z.string().optional().default(""),
  dateTo: z.string().optional().default(""),
  company: z.string().optional().default(""),
  respondent: z.string().optional().default(""),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("dashboard.reports");
    const ctx = await loadAuthzContext(session);

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid narrative request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const org = {
      ...emptyDashboardOrgFilters,
      department: parsed.data.department,
      partner: parsed.data.partner,
      service: parsed.data.service,
      businessManager: parsed.data.businessManager,
      jobManager: parsed.data.jobManager,
      dateFrom: parsed.data.dateFrom,
      dateTo: parsed.data.dateTo,
      company: parsed.data.company,
      respondent: parsed.data.respondent,
    };

    const plan = resolveAnnualCxPeriodPlan(parsed.data.window);

    const responses = await db.response.findMany({
      where: { AND: [{ excludedAt: null }, responseScopeWhere(ctx)] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        conversationId: true,
        csatScore: true,
        cesScore: true,
        npsScore: true,
        answers: true,
        completedAt: true,
        createdAt: true,
        client: { select: { name: true, company: true } },
        insight: {
          select: {
            overallSentiment: true,
            keyDrivers: true,
            riskSignals: true,
          },
        },
        surveyInvite: {
          select: {
            department: true,
            partner: true,
            serviceName: true,
            businessManagerName: true,
            jobManagerName: true,
          },
        },
      },
    });

    const answersByResponseId = new Map<string, unknown>();
    const analyticsItems: Array<
      DashboardAnalyticsItem & {
        department?: string | null;
        partner?: string | null;
        serviceName?: string | null;
        businessManagerName?: string | null;
        jobManagerName?: string | null;
        company?: string | null;
        customerName?: string | null;
        client?: { company?: string | null; name?: string | null } | null;
      }
    > = responses.map((response) => {
      answersByResponseId.set(response.id, response.answers);
      const keyDrivers = Array.isArray(response.insight?.keyDrivers)
        ? response.insight.keyDrivers.filter(
            (item): item is string => typeof item === "string"
          )
        : [];
      const riskSignals = Array.isArray(response.insight?.riskSignals)
        ? response.insight.riskSignals.filter(
            (item): item is string => typeof item === "string"
          )
        : [];
      return {
        responseId: response.id,
        submittedAt: (
          response.completedAt ?? response.createdAt
        ).toISOString(),
        company: response.client?.company?.trim() || null,
        clientName: response.client?.name?.trim() || null,
        source: getResponseSource(response.conversationId),
        sentiment: resolveOverallSentiment({
          csatScore: response.csatScore,
          cesScore: response.cesScore,
          npsScore: response.npsScore,
          storedSentiment: response.insight?.overallSentiment,
        }),
        metrics: {
          csat: response.csatScore,
          ces: response.cesScore,
          nps: response.npsScore,
        },
        keyDrivers,
        riskSignals,
        answers: [],
        department: response.surveyInvite?.department ?? null,
        partner: response.surveyInvite?.partner ?? null,
        serviceName: response.surveyInvite?.serviceName ?? null,
        businessManagerName:
          response.surveyInvite?.businessManagerName ?? null,
        jobManagerName: response.surveyInvite?.jobManagerName ?? null,
        customerName: response.client?.name?.trim() || null,
        client: response.client,
      };
    });

    const filtered = filterItemsForAnnualRange(
      analyticsItems,
      plan.current,
      org
    );

    const result = await generateCxReportNarrative({
      periodStart: plan.current.start,
      periodEnd: plan.current.end,
      periodLabel: plan.currentLabel,
      filters: { ...org, window: parsed.data.window },
      items: filtered,
      answersByResponseId,
      createdById: ctx.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return NextResponse.json(
        { error: "OpenAI is not configured for narrative generation." },
        { status: 503 }
      );
    }
    try {
      return routeErrorResponse(error);
    } catch {
      console.error("CX report narrative failed", error);
      return NextResponse.json(
        { error: "Unable to generate report narrative" },
        { status: 500 }
      );
    }
  }
}
