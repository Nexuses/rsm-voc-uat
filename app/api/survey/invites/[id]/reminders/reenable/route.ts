import { NextRequest, NextResponse } from "next/server";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import { inviteInScope, loadAuthzContext } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import { reenableInviteReminders } from "@/lib/survey-invite-tracking";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("invite.tracker");
    const { id } = await context.params;
    const ctx = await loadAuthzContext(session);
    if (!(await inviteInScope(ctx, id))) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }

    const result = await reenableInviteReminders({
      inviteId: id,
      actorUserId: session.user.id,
    });

    if (!result.ok) {
      const status = result.reason === "not_found" ? 404 : 409;
      const message =
        result.reason === "completed"
          ? "This recipient has already completed the survey."
          : "Invite not found.";
      return NextResponse.json({ error: message, reason: result.reason }, { status });
    }

    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "survey_invite.reminders_reenabled",
      resourceType: "SurveyInvite",
      resourceId: id,
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
    console.error("reenable invite reminders failed", error);
    return NextResponse.json(
      { error: "Failed to re-enable reminders" },
      { status: 500 }
    );
  }
}
