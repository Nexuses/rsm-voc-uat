import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import { loadAuthzContext, testimonialScopeWhere } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import { setTestimonialAdminStatus } from "@/lib/testimonials/admin";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["publish", "archive"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("testimonials.manage");
    const { id } = await context.params;
    const ctx = await loadAuthzContext(session);
    const visible = await db.testimonial.findFirst({
      where: { AND: [{ id }, testimonialScopeWhere(ctx)] },
      select: { id: true },
    });
    if (!visible) {
      return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });
    }
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const result = await setTestimonialAdminStatus({
      id,
      action: parsed.data.action,
      actorUserId: session.user.id,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, status: result.status });
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
