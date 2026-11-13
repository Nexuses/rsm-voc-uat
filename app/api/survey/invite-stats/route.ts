import { NextResponse } from "next/server";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import { inviteScopeWhere, loadAuthzContext } from "@/lib/authz";
import { listSurveyInviteRecords } from "@/lib/survey-invite-tracking";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";

export async function GET() {
  try {
    const session = await requirePermission("invite.tracker");
    const ctx = await loadAuthzContext(session);
    const invites = await listSurveyInviteRecords(inviteScopeWhere(ctx));
    return NextResponse.json({ invites });
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
    throw error;
  }
}
