import { NextRequest, NextResponse } from "next/server";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import { deleteSurveyInvite } from "@/lib/survey-invite-tracking";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("responses.manage");
    const { id } = await context.params;

    const result = await deleteSurveyInvite({
      inviteId: id,
      actorUserId: session.user.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

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
    console.error("survey invite delete failed", error);
    return NextResponse.json({ error: "Failed to delete invitation" }, { status: 500 });
  }
}
