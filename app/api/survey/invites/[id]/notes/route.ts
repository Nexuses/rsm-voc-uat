import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
import { addSurveyInviteNote } from "@/lib/survey-invite-tracking";
import { writeAuditLog } from "@/lib/audit";

const noteSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("invite.tracker");
    const { id } = await context.params;
    const ctx = await loadAuthzContext(session);
    if (!(await inviteInScope(ctx, id))) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }
    const parsed = noteSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "A note message is required." }, { status: 400 });
    }

    const event = await addSurveyInviteNote({
      inviteId: id,
      message: parsed.data.message,
      actorUserId: session.user.id,
    });

    if (!event) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "survey_invite.note_added",
      resourceType: "SurveyInvite",
      resourceId: id,
      metadata: { length: parsed.data.message.length },
      source: "api",
    });

    return NextResponse.json({ ok: true, event });
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
    console.error("survey invite note failed", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
