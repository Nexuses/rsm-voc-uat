import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import { loadAuthzContext } from "@/lib/authz";
import { getCaseDetail } from "@/lib/cases/queries";
import {
  assignCase,
  CaseTransitionError,
  recordClientConfirmation,
  setClientConfirmationRequired,
  transitionCase,
} from "@/lib/cases/service";
import { CASE_STATUSES } from "@/lib/cases/state";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("transition"),
    toStatus: z.enum(CASE_STATUSES),
    note: z.string().trim().max(2000).optional(),
  }),
  z.object({
    action: z.literal("assign"),
    ownerUserId: z.string().min(1).nullable(),
  }),
  z.object({
    action: z.literal("confirm_client"),
    confirmed: z.boolean(),
    note: z.string().trim().max(2000).optional(),
  }),
  z.object({
    action: z.literal("require_confirmation"),
    required: z.boolean(),
  }),
]);

function errorResponse(error: unknown) {
  if (isCxAuthError(error)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isCxPermissionError(error)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (error instanceof CaseTransitionError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (isTransientPrismaError(error)) return databaseUnavailableResponse();
  throw error;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("cases.read");
    const { id } = await context.params;
    const detail = await getCaseDetail(await loadAuthzContext(session), id);
    if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("cases.manage");
    const { id } = await context.params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid case update" }, { status: 400 });
    }
    const ctx = await loadAuthzContext(session);
    if (!(await getCaseDetail(ctx, id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (parsed.data.action === "transition") {
      await transitionCase({
        caseId: id,
        toStatus: parsed.data.toStatus,
        note: parsed.data.note,
        actorUserId: session.user.id,
      });
    } else if (parsed.data.action === "assign") {
      await assignCase({
        caseId: id,
        ownerUserId: parsed.data.ownerUserId,
        actorUserId: session.user.id,
      });
    } else if (parsed.data.action === "confirm_client") {
      await recordClientConfirmation({
        caseId: id,
        confirmed: parsed.data.confirmed,
        note: parsed.data.note,
        actorUserId: session.user.id,
      });
    } else {
      await setClientConfirmationRequired({
        caseId: id,
        required: parsed.data.required,
        actorUserId: session.user.id,
      });
    }
    return NextResponse.json(await getCaseDetail(ctx, id));
  } catch (error) {
    return errorResponse(error);
  }
}
