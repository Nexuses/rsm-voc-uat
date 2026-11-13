import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { emptySurveyInviteContext } from "@/lib/survey/invite-context";
import { loadSurveyInviteContext } from "@/lib/survey/load-invite-context";
import {
  consumeSurveyRateLimit,
  validatePublicPost,
} from "@/lib/survey/request-security";

export const runtime = "nodejs";

const inviteContextSchema = z
  .object({
    inviteToken: z.string().trim().min(8).max(128),
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

  const parsed = inviteContextSchema.safeParse(unknownPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid invite context payload" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const rateLimit = await consumeSurveyRateLimit(request, "invite-context");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "too many invite context attempts" },
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
    const inviteContext = await loadSurveyInviteContext(parsed.data.inviteToken);
    return NextResponse.json({ inviteContext }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("survey invite context failed:", error);
    return NextResponse.json(
      { inviteContext: emptySurveyInviteContext() },
      { headers: noStoreHeaders }
    );
  }
}
