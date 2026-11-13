import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  isPermission,
  PERMISSIONS,
  type Permission,
} from "@/lib/rbac/permissions";
import { decideRolePermissionEdit } from "@/lib/rbac/guards";
import { ensureSystemRoles, getUserPermissionSet } from "@/lib/rbac/roles";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";

const roleBodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_-]+$/),
  description: z.string().trim().max(240).optional(),
  permissions: z.array(z.string()).min(1),
});

const updateRoleSchema = z.object({
  roleId: z.string().uuid(),
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(240).nullable().optional(),
  permissions: z.array(z.string()).min(1).optional(),
});

function normalizePermissions(values: string[]): Permission[] {
  return [...new Set(values.filter(isPermission))];
}

export async function GET() {
  try {
    await requirePermission("roles.manage");
    await ensureSystemRoles();

    const roles = await db.role.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: {
        permissions: { select: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    return NextResponse.json({
      permissions: PERMISSIONS,
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystem: role.isSystem,
        userCount: role._count.users,
        permissions: role.permissions.map((row) => row.permission),
      })),
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

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("roles.manage");
    const parsed = roleBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid role payload" }, { status: 400 });
    }

    const permissions = normalizePermissions(parsed.data.permissions);
    if (!permissions.length) {
      return NextResponse.json(
        { error: "Select at least one valid permission" },
        { status: 400 }
      );
    }

    const createDecision = decideRolePermissionEdit({
      isSystemRole: false,
      actorPermissions: await getUserPermissionSet(session.user.id),
      requestedPermissions: permissions,
    });
    if (!createDecision.ok) {
      return NextResponse.json(
        { error: createDecision.error },
        { status: createDecision.status }
      );
    }

    const role = await db.role.create({
      data: {
        id: randomUUID(),
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        isSystem: false,
        permissions: {
          create: permissions.map((permission) => ({
            id: randomUUID(),
            permission,
          })),
        },
      },
    });

    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "role.created",
      resourceType: "Role",
      resourceId: role.id,
      metadata: { slug: role.slug, permissions },
    });

    return NextResponse.json({ ok: true, roleId: role.id });
  } catch (error) {
    if (isCxAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isCxPermissionError(error)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Role slug already exists" }, { status: 409 });
    }
    if (isTransientPrismaError(error)) {
      return databaseUnavailableResponse();
    }
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requirePermission("roles.manage");
    const parsed = updateRoleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
    }

    const role = await db.role.findUnique({ where: { id: parsed.data.roleId } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (role.isSystem && parsed.data.name !== undefined && parsed.data.name !== role.name) {
      return NextResponse.json(
        { error: "System roles cannot be renamed" },
        { status: 400 }
      );
    }

    let permissions: Permission[] | undefined;
    if (parsed.data.permissions) {
      permissions = normalizePermissions(parsed.data.permissions);
      if (!permissions.length) {
        return NextResponse.json(
          { error: "Select at least one valid permission" },
          { status: 400 }
        );
      }
      const decision = decideRolePermissionEdit({
        isSystemRole: role.isSystem,
        actorPermissions: await getUserPermissionSet(session.user.id),
        requestedPermissions: permissions,
      });
      if (!decision.ok) {
        return NextResponse.json(
          { error: decision.error },
          { status: decision.status }
        );
      }
    }

    const before = await db.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permission: true },
    });

    await db.$transaction([
      ...(permissions
        ? [
            db.rolePermission.deleteMany({ where: { roleId: role.id } }),
            db.rolePermission.createMany({
              data: permissions.map((permission) => ({
                id: randomUUID(),
                roleId: role.id,
                permission,
              })),
            }),
          ]
        : []),
      db.role.update({
        where: { id: role.id },
        data: {
          name: parsed.data.name ?? role.name,
          description:
            parsed.data.description === undefined
              ? role.description
              : parsed.data.description,
        },
      }),
    ]);

    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "role.updated",
      resourceType: "Role",
      resourceId: role.id,
      metadata: {
        name: parsed.data.name,
        permissions,
      },
      before: {
        name: role.name,
        description: role.description,
        permissions: before.map((row) => row.permission),
      },
      after: {
        name: parsed.data.name ?? role.name,
        description:
          parsed.data.description === undefined
            ? role.description
            : parsed.data.description,
        permissions: permissions ?? before.map((row) => row.permission),
      },
    });

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

export async function DELETE(request: NextRequest) {
  try {
    const session = await requirePermission("roles.manage");
    const roleId = request.nextUrl.searchParams.get("roleId");
    if (!roleId) {
      return NextResponse.json({ error: "roleId is required" }, { status: 400 });
    }

    const role = await db.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { users: true } } },
    });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    if (role.isSystem) {
      return NextResponse.json(
        { error: "System roles cannot be deleted" },
        { status: 400 }
      );
    }
    if (role._count.users > 0) {
      return NextResponse.json(
        { error: "Reassign users before deleting this role" },
        { status: 409 }
      );
    }

    await db.role.delete({ where: { id: role.id } });

    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "role.deleted",
      resourceType: "Role",
      resourceId: role.id,
      metadata: { slug: role.slug },
    });

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
