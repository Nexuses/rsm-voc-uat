// app/api/insights/route.ts
// AUTH REQUIRED (CX team). Returns per-response insights with filters.
// Gate this behind your NextAuth middleware — anon must get 401.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCxUser } from "@/lib/auth"; // implement with NextAuth; throws/redirects if not authed

export async function GET(req: NextRequest) {
  await requireCxUser(req); // 401 if not a CX user

  const { searchParams } = new URL(req.url);
  const sentiment = searchParams.get("sentiment"); // positive | neutral | negative
  const riskOnly = searchParams.get("risk") === "true";

  const insights = await db.responseInsight.findMany({
    where: {
      ...(sentiment ? { overallSentiment: sentiment } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { response: { include: { client: true } } },
    take: 200,
  });

  const filtered = riskOnly
    ? insights.filter((i) => Array.isArray(i.riskSignals) && (i.riskSignals as string[]).length > 0)
    : insights;

  return NextResponse.json(
    filtered.map((i) => ({
      responseId: i.responseId,
      client: i.response.client
        ? { name: i.response.client.name, company: i.response.client.company, tier: i.response.client.tier }
        : null,
      avgRating: i.response.avgRating,
      sentiment: i.overallSentiment,
      summary: i.satisfactionSummary,
      keyDrivers: i.keyDrivers,
      riskSignals: i.riskSignals,
      suggestedReply: i.suggestedReply,
      nextSteps: i.nextSteps,
      answers: i.response.answers,
    }))
  );
}
