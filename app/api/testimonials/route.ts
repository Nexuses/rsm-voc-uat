import { NextRequest, NextResponse } from "next/server";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import { loadAuthzContext } from "@/lib/authz";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import {
  isTestimonialAdminStatus,
  listTestimonials,
} from "@/lib/testimonials/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission("testimonials.manage");
    const ctx = await loadAuthzContext(session);
    const statusParam = request.nextUrl.searchParams.get("status")?.trim() ?? "";
    const status = statusParam && isTestimonialAdminStatus(statusParam) ? statusParam : undefined;
    if (statusParam && !status) {
      return NextResponse.json({ error: "Unknown status" }, { status: 400 });
    }
    const testimonials = await listTestimonials(status, ctx);
    return NextResponse.json({ testimonials });
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
