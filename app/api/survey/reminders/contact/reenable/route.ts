import { NextRequest, NextResponse } from "next/server";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import { reenableContactReminders } from "@/lib/survey-invite-tracking";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("invite.tracker");
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim();
    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const result = await reenableContactReminders({
      email,
      actorUserId: session.user.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Invalid email", reason: result.reason },
        { status: 400 }
      );
    }

    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "survey_invite.contact_reminders_reenabled",
      resourceType: "SurveyReminderContactStop",
      metadata: { email, inviteCount: result.inviteCount },
      source: "api",
    });

    return NextResponse.json({ ok: true, inviteCount: result.inviteCount });
  } catch (error) {
    if (isCxAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isCxPermissionError(error)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isTransientPrismaError(error)) {
      return databaseUnavailableResponse();
    }
    console.error("reenable contact reminders failed", error);
    return NextResponse.json(
      { error: "Failed to re-enable contact reminders" },
      { status: 500 }
    );
  }
}
