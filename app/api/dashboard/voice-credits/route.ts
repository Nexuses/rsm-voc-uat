import { NextResponse } from "next/server";
import {
  isCxAuthError,
  isCxPermissionError,
  requireAnyPermission,
} from "@/lib/auth";
import { getElevenLabsVoiceCredits } from "@/lib/elevenlabs/subscription";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function GET() {
  try {
    await requireAnyPermission([
      "dashboard.overview",
      "dashboard.reports",
      "invite.send",
    ]);

    const credits = await getElevenLabsVoiceCredits();
    return NextResponse.json(credits, { headers: noStoreHeaders });
  } catch (error) {
    if (isCxAuthError(error)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: noStoreHeaders }
      );
    }
    if (isCxPermissionError(error)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: noStoreHeaders }
      );
    }
    if (isTransientPrismaError(error)) {
      return databaseUnavailableResponse();
    }
    console.error("voice credits lookup failed:", error);
    return NextResponse.json(
      { error: "Unable to load voice credits" },
      { status: 503, headers: noStoreHeaders }
    );
  }
}
