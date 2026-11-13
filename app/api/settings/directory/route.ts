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
  createDirectoryEntry,
  DirectoryRequestError,
  listDirectoryEntries,
} from "@/lib/survey-directory";

const createSchema = z.object({
  role: z.string(),
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

export async function GET() {
  try {
    await requireAnyPermission(SETTINGS_DIRECTORY_PERMISSIONS);
    const entries = await listDirectoryEntries();
    return NextResponse.json({ entries });
  } catch (error) {
    const response = directoryErrorResponse(error);
    if (response) return response;
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAnyPermission(SETTINGS_DIRECTORY_PERMISSIONS);
    const body = createSchema.parse(await request.json());
    const entry = await createDirectoryEntry(body);
    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "directory.created",
      resourceType: "StaffContact",
      resourceId: entry.id,
      source: "api",
      metadata: { role: entry.role, name: entry.name },
      after: entry,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Enter a name." }, { status: 400 });
    }
    const response = directoryErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
