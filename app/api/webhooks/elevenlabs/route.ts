import { NextRequest, NextResponse } from "next/server";
import { verifyElevenLabsSignature } from "@/lib/elevenlabs-verify";
import { normalizeElevenLabsPayload } from "@/lib/elevenlabs/payload";
import { ingestSurveyResponseDeferred } from "@/lib/survey/ingest";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "webhook secret is not configured" },
      { status: 500 }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("elevenlabs-signature");
  if (!verifyElevenLabsSignature(rawBody, signature, secret)) {
    return NextResponse.json(
      { error: "invalid signature" },
      { status: 401 }
    );
  }

  let unknownPayload: unknown;
  try {
    unknownPayload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "invalid JSON" },
      { status: 400 }
    );
  }

  let normalized: ReturnType<typeof normalizeElevenLabsPayload>;
  try {
    normalized = normalizeElevenLabsPayload(unknownPayload);
  } catch (error) {
    console.error("invalid webhook payload:", error);
    return NextResponse.json(
      { error: "invalid webhook payload" },
      { status: 400 }
    );
  }

  try {
    const result = await ingestSurveyResponseDeferred(normalized);
    return NextResponse.json({
      ok: true,
      responseId: result.responseId,
    });
  } catch (error) {
    console.error("webhook ingest failed:", error);
    return NextResponse.json(
      { error: "webhook ingest failed" },
      { status: 503 }
    );
  }
}
