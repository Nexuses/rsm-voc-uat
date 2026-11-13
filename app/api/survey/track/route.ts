import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordSurveyInviteEvent } from "@/lib/survey-invite-tracking";
import {
  consumeSurveyRateLimit,
  validatePublicPost,
} from "@/lib/survey/request-security";

export const runtime = "nodejs";

const trackSchema = z.object({
  token: z.string().trim().min(8).max(128),
  event: z.enum(["open", "start"]),
});

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function POST(request: NextRequest) {
  const security = validatePublicPost(request);
  if (!security.ok) {
    return NextResponse.json(
      { error: security.error },
      { status: security.status, headers: noStoreHeaders }
    );
  }

  let unknownPayload: unknown;
  try {
    unknownPayload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid JSON" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = trackSchema.safeParse(unknownPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid tracking payload" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const rateLimit = await consumeSurveyRateLimit(request, "track");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "too many requests" },
      {
        status: 429,
        headers: {
          ...noStoreHeaders,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const recorded = await recordSurveyInviteEvent(
      parsed.data.token,
      parsed.data.event
    );
    if (!recorded) {
      return NextResponse.json(
        { error: "invite not found" },
        { status: 404, headers: noStoreHeaders }
      );
    }
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("survey invite tracking failed", error);
    return NextResponse.json(
      { error: "tracking failed" },
      { status: 503, headers: noStoreHeaders }
    );
  }
}
