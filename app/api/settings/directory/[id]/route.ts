import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import {
  isCxAuthError,
  isCxPermissionError,
  requireAnyPermission,
} from "@/lib/auth";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import { SETTINGS_DIRECTORY_PERMISSIONS } from "@/lib/rbac/settings-tabs";
import {
  deleteDirectoryEntry,
  DirectoryRequestError,
  updateDirectoryEntry,
} from "@/lib/survey-directory";

const updateSchema = z.object({
  name: z.unknown(),
  email: z.unknown().optional(),
});

function directoryErrorResponse(error: unknown) {
  if (isCxAuthError(error)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isCxPermissionError(error)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (error instanceof DirectoryRequestError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (isTransientPrismaError(error)) {
    return databaseUnavailableResponse();
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAnyPermission(SETTINGS_DIRECTORY_PERMISSIONS);
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());
    const { previous, entry } = await updateDirectoryEntry(id, body);
    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "directory.updated",
      resourceType: "StaffContact",
      resourceId: entry.id,
      source: "api",
      metadata: { role: entry.role, name: entry.name },
      before: previous,
      after: entry,
    });
    return NextResponse.json({ entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Enter a name." }, { status: 400 });
    }
    const response = directoryErrorResponse(error);
    if (response) return response;
    throw error;
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAnyPermission(SETTINGS_DIRECTORY_PERMISSIONS);
    const { id } = await context.params;
    const removed = await deleteDirectoryEntry(id);
    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "directory.deleted",
      resourceType: "StaffContact",
      resourceId: removed.id,
      source: "api",
      metadata: { role: removed.role, name: removed.name },
      before: removed,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const response = directoryErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
