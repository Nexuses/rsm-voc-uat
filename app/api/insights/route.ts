import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { can, loadAuthzContext, responseScopeWhere } from "@/lib/authz";
import {
  isCxAuthError,
  isCxPermissionError,
  requireAnyPermission,
} from "@/lib/auth";
import { cxResponseInsightsSelect } from "@/lib/cx-response-select";
import { db } from "@/lib/db";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import { mapCxResponseToDashboardInsight } from "@/lib/cx-insights-map";
import { resolveOverallSentiment } from "@/lib/survey/metrics";

const filtersSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  risk: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAnyPermission([
      "dashboard.overview",
      "dashboard.reports",
      "dashboard.responses",
      "dashboard.insights",
    ]);
    const ctx = await loadAuthzContext(session);
    const canSeeContactEmail = can(ctx, "dashboard.responses");

    const parsed = filtersSchema.safeParse({
      sentiment: request.nextUrl.searchParams.get("sentiment") ?? undefined,
      risk: request.nextUrl.searchParams.get("risk") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
    }

    const responses = await db.response.findMany({
      where: { AND: [{ excludedAt: null }, responseScopeWhere(ctx)] },
      orderBy: { createdAt: "desc" },
      select: cxResponseInsightsSelect,
      take: 500,
    });

    const filtered =
      responses.filter((response) => {
        if (
          parsed.data.sentiment &&
          resolveOverallSentiment({
            csatScore: response.csatScore,
            cesScore: response.cesScore,
            npsScore: response.npsScore,
            storedSentiment: response.insight?.overallSentiment,
          }) !== parsed.data.sentiment
        ) {
          return false;
        }
        return parsed.data.risk !== "true" ||
          (Array.isArray(response.insight?.riskSignals) &&
            response.insight.riskSignals.length > 0);
      });

    return NextResponse.json(
      filtered.map((response) => {
        const insight = mapCxResponseToDashboardInsight(response);
        if (canSeeContactEmail || !insight.client) return insight;
        return { ...insight, client: { ...insight.client, email: null } };
      })
    );
  } catch (error) {
    if (isCxAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isCxPermissionError(error)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isTransientPrismaError(error)) {
      return databaseUnavailableResponse();
    }
    throw error;
  }
}
