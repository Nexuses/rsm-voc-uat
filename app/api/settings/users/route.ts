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
import { hashPassword } from "@/lib/password";
import {
  decideUserRoleAssignment,
  permissionsBeyondActor,
} from "@/lib/rbac/guards";
import { SYSTEM_ROLE_SLUGS } from "@/lib/rbac/permissions";
import {
  backfillUserRoles,
  ensureSystemRoles,
  getUserPermissionSet,
} from "@/lib/rbac/roles";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";

const createUserSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(200),
  roleId: z.string().uuid(),
});

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});

const setDisabledSchema = z.object({
  userId: z.string().uuid(),
  disabled: z.boolean(),
});

export async function GET() {
  try {
    await requirePermission("users.manage");
    await backfillUserRoles();

    const users = await db.user.findMany({
      orderBy: { email: "asc" },
      select: {
        id: true,
        email: true,
        role: true,
        roleId: true,
        disabledAt: true,
        roleRef: { select: { id: true, name: true, slug: true } },
      },
    });
    const roles = await db.role.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, isSystem: true },
    });

    return NextResponse.json({ users, roles });
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
    const session = await requirePermission("users.manage");
    await ensureSystemRoles();

    const parsed = createUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user payload" }, { status: 400 });
    }

    const role = await db.role.findUnique({
      where: { id: parsed.data.roleId },
      include: { permissions: { select: { permission: true } } },
    });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    const beyond = permissionsBeyondActor(
      await getUserPermissionSet(session.user.id),
      role.permissions.map((row) => row.permission)
    );
    if (beyond.length) {
      return NextResponse.json(
        { error: "You cannot assign a role with permissions you do not hold" },
        { status: 403 }
      );
    }

    const user = await db.user.create({
      data: {
        id: randomUUID(),
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        role: role.slug,
        roleId: role.id,
      },
    });

    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "user.created",
      resourceType: "User",
      resourceId: user.id,
      metadata: { email: user.email, role: role.slug },
    });

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role, roleId: user.roleId },
    });
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
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    if (isTransientPrismaError(error)) {
      return databaseUnavailableResponse();
    }
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requirePermission("users.manage");

    const body = await request.json();
    const disableParsed = setDisabledSchema.safeParse(body);
    if (disableParsed.success) {
      return setUserDisabled(session.user.id, disableParsed.data);
    }

    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
    }

    const role = await db.role.findUnique({
      where: { id: parsed.data.roleId },
      include: { permissions: { select: { permission: true } } },
    });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const target = await db.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, role: true, roleRef: { select: { slug: true } } },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const previousRole = target.roleRef?.slug ?? target.role;
    const adminCount = await db.user.count({
      where: {
        disabledAt: null,
        OR: [
          { roleRef: { slug: SYSTEM_ROLE_SLUGS.admin } },
          { roleId: null, role: SYSTEM_ROLE_SLUGS.admin },
        ],
      },
    });
    const decision = decideUserRoleAssignment({
      actorUserId: session.user.id,
      targetUserId: target.id,
      actorPermissions: await getUserPermissionSet(session.user.id),
      rolePermissions: role.permissions.map((row) => row.permission),
      targetCurrentlyAdmin: previousRole === SYSTEM_ROLE_SLUGS.admin,
      newRoleIsAdmin: role.slug === SYSTEM_ROLE_SLUGS.admin,
      adminCount,
    });
    if (!decision.ok) {
      return NextResponse.json({ error: decision.error }, { status: decision.status });
    }

    const user = await db.user.update({
      where: { id: target.id },
      data: {
        roleId: role.id,
        role: role.slug,
        sessionVersion: { increment: 1 },
      },
    });

    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "user.role_assigned",
      resourceType: "User",
      resourceId: user.id,
      metadata: { role: role.slug },
      before: { role: previousRole },
      after: { role: role.slug },
    });

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role, roleId: user.roleId },
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

async function setUserDisabled(
  actorUserId: string,
  input: { userId: string; disabled: boolean }
) {
  if (input.userId === actorUserId) {
    return NextResponse.json(
      { error: "You cannot disable your own account" },
      { status: 403 }
    );
  }
  const target = await db.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      role: true,
      disabledAt: true,
      roleRef: { select: { slug: true } },
    },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (input.disabled && (target.roleRef?.slug ?? target.role) === SYSTEM_ROLE_SLUGS.admin) {
    const activeAdmins = await db.user.count({
      where: {
        disabledAt: null,
        OR: [
          { roleRef: { slug: SYSTEM_ROLE_SLUGS.admin } },
          { roleId: null, role: SYSTEM_ROLE_SLUGS.admin },
        ],
      },
    });
    if (activeAdmins <= 1) {
      return NextResponse.json(
        { error: "At least one administrator must remain" },
        { status: 409 }
      );
    }
  }

  const disabledAt = input.disabled ? target.disabledAt ?? new Date() : null;
  await db.user.update({
    where: { id: target.id },
    data: { disabledAt, sessionVersion: { increment: 1 } },
  });

  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: input.disabled ? "user.disabled" : "user.enabled",
    resourceType: "User",
    resourceId: target.id,
    metadata: { email: target.email },
    before: { disabled: Boolean(target.disabledAt) },
    after: { disabled: input.disabled },
    source: "api",
  });

  return NextResponse.json({ ok: true, disabled: input.disabled });
}
