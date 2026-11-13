import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadAuthzContext, responseScopeWhere } from "@/lib/authz";
import {
  isCxAuthError,
  isCxPermissionError,
  requireAnyPermission,
} from "@/lib/auth";
import type { DashboardWindow } from "@/lib/dashboard-analytics";
import { db } from "@/lib/db";
import {
  buildLeaderboard,
  DEFAULT_LEADERBOARD_MIN_N,
  filterLeaderboardRows,
  isLeaderboardDimension,
  isLeaderboardMetric,
  type LeaderboardSourceRow,
} from "@/lib/leaderboard";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";

const querySchema = z.object({
  dimension: z.string().refine(isLeaderboardDimension, "Invalid dimension"),
  metric: z
    .string()
    .optional()
    .transform((value) => value ?? "csat")
    .refine(isLeaderboardMetric, "Invalid metric"),
  window: z.enum(["all", "90d", "year"]).default("all"),
  dateFrom: z.string().optional().default(""),
  dateTo: z.string().optional().default(""),
  minN: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return DEFAULT_LEADERBOARD_MIN_N;
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_LEADERBOARD_MIN_N;
    }),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAnyPermission([
      "dashboard.leaderboard",
      "dashboard.reports",
    ]);
    const ctx = await loadAuthzContext(session);

    const parsed = querySchema.safeParse({
      dimension: request.nextUrl.searchParams.get("dimension") ?? undefined,
      metric: request.nextUrl.searchParams.get("metric") ?? undefined,
      window: request.nextUrl.searchParams.get("window") ?? undefined,
      dateFrom: request.nextUrl.searchParams.get("dateFrom") ?? undefined,
      dateTo: request.nextUrl.searchParams.get("dateTo") ?? undefined,
      minN: request.nextUrl.searchParams.get("minN") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid leaderboard filters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const responses = await db.response.findMany({
      where: { AND: [{ excludedAt: null }, responseScopeWhere(ctx)] },
      orderBy: { createdAt: "desc" },
      select: {
        csatScore: true,
        cesScore: true,
        npsScore: true,
        completedAt: true,
        createdAt: true,
        surveyInvite: {
          select: {
            department: true,
            partner: true,
            businessManagerName: true,
            jobManagerName: true,
          },
        },
      },
    });

    const sourceRows: LeaderboardSourceRow[] = responses.map((response) => ({
      submittedAt: (
        response.completedAt ?? response.createdAt
      ).toISOString(),
      csatScore: response.csatScore,
      cesScore: response.cesScore,
      npsScore: response.npsScore,
      department: response.surveyInvite?.department ?? null,
      partner: response.surveyInvite?.partner ?? null,
      businessManagerName: response.surveyInvite?.businessManagerName ?? null,
      jobManagerName: response.surveyInvite?.jobManagerName ?? null,
    }));

    const filtered = filterLeaderboardRows(
      sourceRows,
      parsed.data.window as DashboardWindow,
      parsed.data.dateFrom,
      parsed.data.dateTo
    );

    const result = buildLeaderboard({
      rows: filtered,
      dimension: parsed.data.dimension,
      metric: parsed.data.metric,
      minN: parsed.data.minN,
    });

    return NextResponse.json({
      ...result,
      responseCount: filtered.length,
      window: parsed.data.window,
      dateFrom: parsed.data.dateFrom,
      dateTo: parsed.data.dateTo,
    });
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
    console.error("Leaderboard failed", error);
    return NextResponse.json(
      { error: "Unable to build leaderboard" },
      { status: 500 }
    );
  }
}
