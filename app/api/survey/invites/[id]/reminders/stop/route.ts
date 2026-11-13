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
import { stopInviteReminders } from "@/lib/survey-invite-tracking";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("invite.tracker");
    const { id } = await context.params;
    const ctx = await loadAuthzContext(session);
    if (!(await inviteInScope(ctx, id))) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      reason?: string;
    };

    const result = await stopInviteReminders({
      inviteId: id,
      actorUserId: session.user.id,
      reason: body.reason,
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
      action: "survey_invite.reminders_stopped",
      resourceType: "SurveyInvite",
      resourceId: id,
      metadata: { reason: body.reason ?? null },
      source: "api",
    });

    return NextResponse.json({ ok: true, already: result.already });
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
    console.error("stop invite reminders failed", error);
    return NextResponse.json({ error: "Failed to stop reminders" }, { status: 500 });
  }
}
