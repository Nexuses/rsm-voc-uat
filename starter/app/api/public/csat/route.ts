// app/api/public/csat/route.ts
// PUBLIC, NO AUTH. Reads ONLY csat_snapshot + theme_rollup. Must never expose client
// identity or raw verbatims. Do not import the Response/Client/Insight models here.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const snapshots = await db.csatSnapshot.findMany({ orderBy: { period: "asc" } });
  const themes = await db.themeRollup.findMany({ orderBy: { period: "asc" } });

  const latest = snapshots[snapshots.length - 1];
  const totalCount = snapshots.reduce((s, x) => s + x.responseCount, 0);
  const weightedAvg =
    totalCount > 0
      ? snapshots.reduce((s, x) => s + x.avgRating * x.responseCount, 0) / totalCount
      : 0;

  return NextResponse.json({
    overallAvg: Number(weightedAvg.toFixed(2)),
    totalResponses: totalCount,
    latestPeriod: latest?.period ?? null,
    trend: snapshots.map((s) => ({ period: s.period, avg: s.avgRating, count: s.responseCount })),
    distribution: latest?.distribution ?? { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
    themes: themes.map((t) => ({
      label: t.themeLabel,
      sentiment: t.sentiment,
      summary: t.publicSummary, // PII-free AI summary only
    })),
  });
}
