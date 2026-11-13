import type { DashboardAnalyticsItem } from "@/lib/dashboard-analytics";
import {
  inviteScopeWhere,
  responseScopeWhere,
  type AuthzContext,
} from "@/lib/authz";
import { getResponseSource } from "@/lib/cx-response-select";
import { db } from "@/lib/db";
import { resolveOverallSentiment } from "@/lib/survey/metrics";
import { listSurveyInviteRecords } from "@/lib/survey-invite-tracking";
import type { SurveyInviteRecord } from "@/lib/survey-outreach";
import {
  listPublishableQuotes,
  type AnnualCxQuote,
} from "@/lib/testimonials/quotes";

export type AnnualCxSourceItem = DashboardAnalyticsItem & {
  department?: string | null;
  partner?: string | null;
  serviceName?: string | null;
  businessManagerName?: string | null;
  jobManagerName?: string | null;
  company?: string | null;
  customerName?: string | null;
  client?: { company?: string | null; name?: string | null } | null;
};

export async function loadAnnualCxReportSource(ctx: AuthzContext): Promise<{
  items: AnnualCxSourceItem[];
  invites: SurveyInviteRecord[];
  quotes: AnnualCxQuote[];
}> {
  const [responses, invites, quotes] = await Promise.all([
    db.response.findMany({
      where: { AND: [{ excludedAt: null }, responseScopeWhere(ctx)] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        conversationId: true,
        csatScore: true,
        cesScore: true,
        npsScore: true,
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
    }),
    listSurveyInviteRecords(inviteScopeWhere(ctx)),
    listPublishableQuotes(12, ctx),
  ]);

  const items: AnnualCxSourceItem[] = responses.map((response) => {
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
      submittedAt: (response.completedAt ?? response.createdAt).toISOString(),
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
      businessManagerName: response.surveyInvite?.businessManagerName ?? null,
      jobManagerName: response.surveyInvite?.jobManagerName ?? null,
      customerName: response.client?.name?.trim() || null,
      client: response.client,
    };
  });

  return { items, invites, quotes };
}
