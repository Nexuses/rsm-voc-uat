import { NextResponse } from "next/server";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import { listPublishableQuotes } from "@/lib/testimonials/quotes";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requirePermission("dashboard.overview");
    const quotes = await listPublishableQuotes(6);
    return NextResponse.json({ quotes });
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
