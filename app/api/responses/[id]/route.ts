import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import {
  deleteSurveyResponse,
  excludeSurveyResponse,
  setResponsePublicVisibility,
} from "@/lib/response-admin";

const excludeSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("responses.manage");
    const { id } = await context.params;
    const parsed = excludeSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = await excludeSurveyResponse({
      responseId: id,
      actorUserId: session.user.id,
      reason: parsed.data.reason,
    });

    if (!result.ok) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      alreadyExcluded: result.alreadyExcluded,
    });
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

const visibilitySchema = z.object({
  publicVisibility: z.enum(["approve", "hide", "reset"]),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("responses.manage");
    const { id } = await context.params;
    const parsed = visibilitySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = await setResponsePublicVisibility({
      responseId: id,
      actorUserId: session.user.id,
      action: parsed.data.publicVisibility,
    });
    if (!result.ok) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
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
    throw error;
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("responses.manage");
    const { id } = await context.params;

    const result = await deleteSurveyResponse({
      responseId: id,
      actorUserId: session.user.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
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
    throw error;
  }
}
