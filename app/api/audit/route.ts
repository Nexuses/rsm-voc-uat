import { NextRequest, NextResponse } from "next/server";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import {
  formatAuditDetails,
  labelAuditAction,
  labelAuditActorType,
  labelAuditResourceType,
} from "@/lib/audit";
import { db } from "@/lib/db";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("audit.read");

    const limit = Math.min(
      Number(request.nextUrl.searchParams.get("limit") ?? "100") || 100,
      500
    );
    const action = request.nextUrl.searchParams.get("action")?.trim() || undefined;

    const logs = await db.auditLog.findMany({
      where: action ? { action: { contains: action, mode: "insensitive" } } : undefined,
      orderBy: { occurredAt: "desc" },
      take: limit,
    });

    const actorIds = [
      ...new Set(
        logs
          .map((row) => row.actorUserId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const resourceUserIds = [
      ...new Set(
        logs
          .filter((row) => row.resourceType === "User" && row.resourceId)
          .map((row) => row.resourceId as string)
      ),
    ];
    const userIds = [...new Set([...actorIds, ...resourceUserIds])];

    const users = userIds.length
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true },
        })
      : [];
    const emailById = new Map(users.map((user) => [user.id, user.email]));

    const enriched = logs.map((row) => {
      const actorEmail = row.actorUserId
        ? (emailById.get(row.actorUserId) ?? null)
        : null;
      const resourceEmail =
        row.resourceType === "User" && row.resourceId
          ? (emailById.get(row.resourceId) ?? null)
          : null;
      const metaEmail =
        row.metadata &&
        typeof row.metadata === "object" &&
        !Array.isArray(row.metadata) &&
        typeof (row.metadata as { email?: unknown }).email === "string"
          ? (row.metadata as { email: string }).email
          : null;

      const actorLabel = actorEmail
        ? actorEmail
        : row.actorType === "integration"
          ? "API integration"
          : row.actorType === "system"
            ? metaEmail
              ? `System (${metaEmail})`
              : "System"
            : labelAuditActorType(row.actorType);

      const resourceLabel = resourceEmail
        ? resourceEmail
        : row.resourceType === "SurveyInvite" && metaEmail
          ? metaEmail
          : labelAuditResourceType(row.resourceType) ??
            (row.resourceId ? row.resourceId.slice(0, 8) : null);

      return {
        id: row.id,
        occurredAt: row.occurredAt.toISOString(),
        actorType: row.actorType,
        actorUserId: row.actorUserId,
        actorEmail,
        actorLabel,
        action: row.action,
        actionLabel: labelAuditAction(row.action),
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        resourceLabel: resourceLabel ?? "—",
        detailsLabel: formatAuditDetails({
          action: row.action,
          metadata: row.metadata,
        }),
        metadata: row.metadata,
      };
    });

    return NextResponse.json({ logs: enriched });
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
