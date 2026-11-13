import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  linkSurveyInviteToConversation,
  tryCompleteInviteForConversation,
} from "@/lib/survey-invite-tracking";
import {
  consumeSurveyRateLimit,
  validatePublicPost,
} from "@/lib/survey/request-security";

export const runtime = "nodejs";

const inviteLinkSchema = z.object({
  token: z.string().trim().min(8).max(128),
  conversationId: z.string().trim().min(3).max(128),
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

  const parsed = inviteLinkSchema.safeParse(unknownPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid invite link payload" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const rateLimit = await consumeSurveyRateLimit(request, "invite-link");
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
    const linked = await linkSurveyInviteToConversation(
      parsed.data.token,
      parsed.data.conversationId
    );
    if (!linked) {
      const completed = await tryCompleteInviteForConversation(
        parsed.data.conversationId
      );
      if (!completed) {
        return NextResponse.json(
          { error: "invite not found" },
          { status: 404, headers: noStoreHeaders }
        );
      }
    }
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("survey invite link failed", error);
    return NextResponse.json(
      { error: "invite link failed" },
      { status: 503, headers: noStoreHeaders }
    );
  }
}
