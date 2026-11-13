// lib/aggregate.ts — recompute PII-FREE public metrics. Reads responses, writes ONLY
// csat_snapshot + theme_rollup. These are the only tables the public widget may read.
import { db } from "@/lib/db";

function periodOf(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

export async function recomputeAggregates(): Promise<void> {
  const responses = await db.response.findMany({
    where: { avgRating: { not: null } },
    select: { avgRating: true, answers: true, completedAt: true, createdAt: true },
  });

  const byPeriod = new Map<string, number[]>();
  for (const r of responses) {
    const when = r.completedAt ?? r.createdAt;
    const p = periodOf(when);
    if (!byPeriod.has(p)) byPeriod.set(p, []);
    byPeriod.get(p)!.push(r.avgRating!);
  }

  for (const [period, ratings] of byPeriod) {
    const avg = ratings.reduce((s, x) => s + x, 0) / ratings.length;
    const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const x of ratings) {
      const bucket = String(Math.round(x));
      if (distribution[bucket] !== undefined) distribution[bucket]++;
    }
    await db.csatSnapshot.upsert({
      where: { period },
      update: { avgRating: avg, responseCount: ratings.length, distribution, computedAt: new Date() },
      create: { period, avgRating: avg, responseCount: ratings.length, distribution },
    });
  }

  // ThemeRollup: generate PII-free theme summaries here (e.g. periodic GPT pass over
  // insight.keyDrivers). Left as a clearly-marked TODO so no raw verbatim leaks by default.
  // TODO: aggregate ResponseInsight.keyDrivers per period → sanitised publicSummary.
}
