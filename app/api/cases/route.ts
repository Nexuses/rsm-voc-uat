import { NextRequest, NextResponse } from "next/server";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import { loadAuthzContext } from "@/lib/authz";
import { isCaseView, listCases } from "@/lib/cases/queries";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission("cases.read");
    const params = request.nextUrl.searchParams;
    const view = params.get("view");
    const limit = Number(params.get("limit") ?? (view === "board" ? 200 : 50));

    const result = await listCases({
      ctx: await loadAuthzContext(session),
      view: isCaseView(view) ? view : "open",
      limit: Number.isFinite(limit) ? limit : 50,
      cursor: params.get("cursor"),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isCxAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isCxPermissionError(error)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isTransientPrismaError(error)) return databaseUnavailableResponse();
    throw error;
  }
}
