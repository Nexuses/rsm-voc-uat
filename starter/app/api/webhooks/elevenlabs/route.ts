// app/api/webhooks/elevenlabs/route.ts
// Receives ElevenLabs post-call webhook → verify signature → upsert response (idempotent)
// → generate GPT insight + embedding → trigger aggregate recompute.
//
// NOTE: confirm the exact payload field paths against ElevenLabs' current
// "Post-call webhooks" + "Data Collection" docs and adjust the parsing in `parsePayload`.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyElevenLabsSignature } from "@/lib/elevenlabs-verify";
import { generateInsight, embedText, buildEmbeddingContent, type Answer } from "@/lib/insight";
import { recomputeAggregates } from "@/lib/aggregate";

export const runtime = "nodejs"; // needs raw body + crypto

export async function POST(req: NextRequest) {
  const rawBody = await req.text(); // raw string for signature check
  const sig = req.headers.get("elevenlabs-signature");

  if (!verifyElevenLabsSignature(rawBody, sig, process.env.ELEVENLABS_WEBHOOK_SECRET!)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const parsed = parsePayload(payload);
  if (!parsed.conversationId) {
    return NextResponse.json({ error: "missing conversation id" }, { status: 400 });
  }

  // Idempotent upsert on conversationId (ElevenLabs may retry)
  const response = await db.response.upsert({
    where: { conversationId: parsed.conversationId },
    update: {
      answers: parsed.answers,
      rawPayload: payload,
      language: parsed.language,
      avgRating: parsed.avgRating,
      completedAt: parsed.completedAt,
    },
    create: {
      conversationId: parsed.conversationId,
      answers: parsed.answers,
      rawPayload: payload,
      language: parsed.language,
      avgRating: parsed.avgRating,
      startedAt: parsed.startedAt,
      completedAt: parsed.completedAt,
      client: parsed.clientName || parsed.clientCompany
        ? { create: { name: parsed.clientName, company: parsed.clientCompany, locale: parsed.language ?? "en" } }
        : undefined,
    },
  });

  // Generate + store insight (skip if already present from a retry)
  const existing = await db.responseInsight.findUnique({ where: { responseId: response.id } });
  if (!existing) {
    try {
      const insight = await generateInsight(parsed.answers as Answer[], parsed.language ?? "en");
      await db.responseInsight.create({
        data: {
          responseId: response.id,
          overallSentiment: insight.overallSentiment,
          satisfactionSummary: insight.satisfactionSummary,
          keyDrivers: insight.keyDrivers,
          riskSignals: insight.riskSignals,
          suggestedReply: insight.suggestedReply,
          nextSteps: insight.nextSteps,
          modelVersion: "gpt-4o",
        },
      });

      // Embedding for RAG (raw SQL because Prisma can't write vector directly)
      const content = buildEmbeddingContent(parsed.answers as Answer[], insight);
      const vec = await embedText(content);
      await db.$executeRawUnsafe(
        `INSERT INTO "ResponseEmbedding" (id, "responseId", content, embedding, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3::vector, now())
         ON CONFLICT ("responseId") DO NOTHING`,
        response.id,
        content,
        `[${vec.join(",")}]`
      );
    } catch (err) {
      console.error("insight generation failed:", err);
      // Don't fail the webhook — the response row is saved; insight can be regenerated.
    }
  }

  await recomputeAggregates().catch((e) => console.error("aggregate recompute failed:", e));

  return NextResponse.json({ ok: true, responseId: response.id });
}

// --- payload parsing: adjust paths to match ElevenLabs' actual webhook shape ---
function parsePayload(p: any) {
  const data = p?.data ?? p; // ElevenLabs wraps in { type, data, ... }
  const dc = data?.analysis?.data_collection_results ?? data?.data_collection ?? {};

  // Data-collection fields configured on the agent (see v2 agent guide §6)
  const clientName = readDC(dc, "client_name");
  const clientCompany = readDC(dc, "client_company");
  const language = readDC(dc, "language");

  // Pull q{n}_rating / q{n}_reason pairs into an answers array
  const answers: Answer[] = [];
  for (let n = 1; n <= 20; n++) {
    const rating = readDC(dc, `q${n}_rating`);
    if (rating === undefined || rating === null || rating === "") continue;
    answers.push({
      question_number: n,
      rating: Number(rating),
      reason_text: readDC(dc, `q${n}_reason`) ?? undefined,
    });
  }

  const ratings = answers.map((a) => a.rating).filter((r) => !Number.isNaN(r));
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : undefined;

  return {
    conversationId: data?.conversation_id ?? data?.conversationId,
    clientName,
    clientCompany,
    language,
    answers,
    avgRating,
    startedAt: data?.metadata?.start_time ? new Date(data.metadata.start_time) : undefined,
    completedAt: data?.metadata?.end_time ? new Date(data.metadata.end_time) : new Date(),
  };
}

function readDC(dc: any, key: string) {
  // data_collection_results entries are often { value, rationale } objects
  const entry = dc?.[key];
  if (entry == null) return undefined;
  return typeof entry === "object" && "value" in entry ? entry.value : entry;
}
