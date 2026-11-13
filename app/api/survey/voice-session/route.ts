import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getElevenLabsSignedUrl } from "@/lib/elevenlabs/client";
import { linkSurveyInviteToConversation } from "@/lib/survey-invite-tracking";
import {
  emptySurveyInviteContext,
  toVoiceInviteContext,
} from "@/lib/survey/invite-context";
import { loadSurveyInviteContext } from "@/lib/survey/load-invite-context";
import {
  consumeSurveyRateLimit,
  validatePublicPost,
} from "@/lib/survey/request-security";

export const runtime = "nodejs";

const voiceSessionSchema = z
  .object({
    inviteToken: z.string().trim().min(8).max(128).optional(),
    language: z.enum(["en", "ar"]).default("en"),
  })
  .strict();
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

  const parsed = voiceSessionSchema.safeParse(unknownPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid voice session payload" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const rateLimit = await consumeSurveyRateLimit(request, "voice");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "too many voice session attempts" },
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
    const session = await getElevenLabsSignedUrl();
    const conversationId = session.conversation_id ?? null;

    let inviteContext = toVoiceInviteContext(emptySurveyInviteContext());
    if (parsed.data.inviteToken) {
      try {
        inviteContext = toVoiceInviteContext(
          await loadSurveyInviteContext(parsed.data.inviteToken)
        );
      } catch (error) {
        console.error("survey invite context load failed:", error);
      }

      if (conversationId) {
        try {
          await linkSurveyInviteToConversation(
            parsed.data.inviteToken,
            conversationId
          );
        } catch (error) {
          console.error("survey invite voice link failed:", error);
        }
      }
    }

    return NextResponse.json(
      {
        signedUrl: session.signed_url,
        conversationId,
        inviteContext,
      },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    console.error("ElevenLabs signed URL request failed:", error);
    return NextResponse.json(
      { error: "voice session could not be created" },
      { status: 503, headers: noStoreHeaders }
    );
  }
}
