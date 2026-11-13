import { NextRequest, NextResponse } from "next/server";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import { inviteInScope, loadAuthzContext } from "@/lib/authz";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import { isSmtpConfigured } from "@/lib/survey-invite-email";
import { sendSurveyInviteFollowup } from "@/lib/survey-invite-tracking";
import { writeAuditLog } from "@/lib/audit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("invite.tracker");

    if (!isSmtpConfigured()) {
      return NextResponse.json(
        { error: "Email sending is not configured on this server." },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const ctx = await loadAuthzContext(session);
    if (!(await inviteInScope(ctx, id))) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }
    const result = await sendSurveyInviteFollowup({
      inviteId: id,
      mode: "manual",
      actorUserId: session.user.id,
    });

    if (!result.sent) {
      const message =
        result.reason === "completed"
          ? "This recipient has already completed the survey."
          : result.reason === "stopped"
            ? "Reminders are stopped for this invite or contact."
            : result.reason === "exhausted"
              ? "All reminders for this invite have been used. Re-enable to start a new cycle."
              : "Could not send the follow-up email.";
      return NextResponse.json({ error: message, reason: result.reason }, { status: 409 });
    }

    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "survey_invite.followup_sent",
      resourceType: "SurveyInvite",
      resourceId: id,
      metadata: { mode: "manual" },
      source: "api",
    });

    return NextResponse.json({ ok: true });
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
    console.error("manual survey follow-up send failed", error);
    return NextResponse.json({ error: "Failed to send follow-up email" }, { status: 500 });
  }
}
