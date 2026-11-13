// app/api/chat/route.ts
// AUTH REQUIRED (CX team). RAG chatbot over the feedback corpus:
// embed question → pgvector similarity search → GPT answers WITH citations to response IDs.
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { embedText } from "@/lib/insight";
import { requireCxUser } from "@/lib/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await requireCxUser(req);

  const { question } = await req.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  // 1. Embed the question
  const qVec = await embedText(question);

  // 2. Vector similarity search over response embeddings (top 8)
  const rows: Array<{ responseId: string; content: string; distance: number }> =
    await db.$queryRawUnsafe(
      `SELECT "responseId", content, embedding <=> $1::vector AS distance
       FROM "ResponseEmbedding"
       ORDER BY distance ASC
       LIMIT 8`,
      `[${qVec.join(",")}]`
    );

  // 3. Pull the matching insights + client info for context
  const ids = rows.map((r) => r.responseId);
  const insights = await db.responseInsight.findMany({
    where: { responseId: { in: ids } },
    include: { response: { include: { client: true } } },
  });

  const context = insights
    .map((i) => {
      const c = i.response.client;
      return `RESPONSE ${i.responseId}
Client: ${c?.name ?? "Unknown"}${c?.company ? ` (${c.company})` : ""}${c?.tier ? ` [tier: ${c.tier}]` : ""}
Avg rating: ${i.response.avgRating ?? "n/a"}
Sentiment: ${i.overallSentiment}
Summary: ${i.satisfactionSummary}
Drivers: ${(i.keyDrivers as string[]).join(", ")}
Risks: ${(i.riskSignals as string[]).join(", ")}`;
    })
    .join("\n\n");

  // 4. GPT answers grounded in retrieved context, citing response IDs
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are the CX feedback analyst for RSM in Kuwait. Answer the team's
question using ONLY the feedback context provided. Cite the RESPONSE ids you used in
square brackets, e.g. [response: <id>]. If the context doesn't contain the answer, say so.
When asked to draft a client reply, base it on that client's actual feedback.`,
      },
      { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
  });

  return NextResponse.json({
    answer: completion.choices[0]?.message?.content ?? "",
    sources: ids,
  });
}
