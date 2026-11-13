import { NextResponse } from "next/server";
import { loadAuthzContext, responseScopeWhere } from "@/lib/authz";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import { db } from "@/lib/db";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import { buildSurveyTranscriptView } from "@/lib/survey/transcript";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("dashboard.responses");
    const ctx = await loadAuthzContext(session);
    const { id } = await context.params;

    const response = await db.response.findFirst({
      where: { id, AND: [responseScopeWhere(ctx)] },
      select: {
        csatScore: true,
        cesScore: true,
        npsScore: true,
        answers: true,
        rawPayload: true,
      },
    });

    if (!response) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    return NextResponse.json(
      buildSurveyTranscriptView({
        csatScore: response.csatScore,
        cesScore: response.cesScore,
        npsScore: response.npsScore,
        answers: response.answers,
        rawPayload: response.rawPayload,
      })
    );
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
