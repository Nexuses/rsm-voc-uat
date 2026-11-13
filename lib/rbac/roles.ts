import { createHash, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  ADMIN_PERMISSIONS,
  OPERATIONAL_PERMISSIONS,
  PERMISSIONS,
  PORTFOLIO_PERMISSIONS,
  SURVEYOR_PERMISSIONS,
  SYSTEM_ROLE_SLUGS,
  type Permission,
} from "@/lib/rbac/permissions";

export async function ensureSystemRoles() {
  const admin = await db.role.upsert({
    where: { slug: SYSTEM_ROLE_SLUGS.admin },
    create: {
      id: randomUUID(),
      name: "Administrator",
      slug: SYSTEM_ROLE_SLUGS.admin,
      description: "Full dashboard access including user and role management",
      isSystem: true,
      permissions: {
        create: ADMIN_PERMISSIONS.map((permission) => ({
          id: randomUUID(),
          permission,
        })),
      },
    },
    update: {},
    include: { permissions: true },
  });

  const cx = await db.role.upsert({
    where: { slug: SYSTEM_ROLE_SLUGS.cx },
    create: {
      id: randomUUID(),
      name: "CX Analyst",
      slug: SYSTEM_ROLE_SLUGS.cx,
      description:
        "Operational CX access without response exclusion or user/role administration",
      isSystem: true,
      permissions: {
        create: OPERATIONAL_PERMISSIONS.map((permission) => ({
          id: randomUUID(),
          permission,
        })),
      },
    },
    update: {},
    include: { permissions: true },
  });

  const surveyor = await db.role.upsert({
    where: { slug: SYSTEM_ROLE_SLUGS.surveyor },
    create: {
      id: randomUUID(),
      name: "Surveyor",
      slug: SYSTEM_ROLE_SLUGS.surveyor,
      description: "Send survey invitations and use the invite tracker only",
      isSystem: true,
      permissions: {
        create: SURVEYOR_PERMISSIONS.map((permission) => ({
          id: randomUUID(),
          permission,
        })),
      },
    },
    update: {},
    include: { permissions: true },
  });

  const portfolio = await db.role.upsert({
    where: { slug: SYSTEM_ROLE_SLUGS.portfolio },
    create: {
      id: randomUUID(),
      name: "Portfolio",
      slug: SYSTEM_ROLE_SLUGS.portfolio,
      description:
        "Partner / Job Manager view of invites and responses attributed to them",
      isSystem: true,
      permissions: {
        create: PORTFOLIO_PERMISSIONS.map((permission) => ({
          id: randomUUID(),
          permission,
        })),
      },
    },
    update: {},
    include: { permissions: true },
  });

  await syncRolePermissions(admin.id, ADMIN_PERMISSIONS);
  await syncRolePermissions(cx.id, OPERATIONAL_PERMISSIONS);
  await syncRolePermissions(surveyor.id, SURVEYOR_PERMISSIONS);
  await syncRolePermissions(portfolio.id, PORTFOLIO_PERMISSIONS);

  return { admin, cx, surveyor, portfolio };
}

async function syncRolePermissions(roleId: string, permissions: Permission[]) {
  const existing = await db.rolePermission.findMany({
    where: { roleId },
    select: { permission: true },
  });
  const existingSet = new Set(existing.map((row) => row.permission));
  const desired = new Set(permissions);

  const toAdd = permissions.filter((permission) => !existingSet.has(permission));
  const toRemove = [...existingSet].filter(
    (permission) => !desired.has(permission as Permission)
  );

  if (toAdd.length) {
    await db.rolePermission.createMany({
      data: toAdd.map((permission) => ({
        id: randomUUID(),
        roleId,
        permission,
      })),
      skipDuplicates: true,
    });
  }

  if (toRemove.length) {
    await db.rolePermission.deleteMany({
      where: { roleId, permission: { in: toRemove } },
    });
  }
}

export async function backfillUserRoles() {
  const { admin, cx, surveyor, portfolio } = await ensureSystemRoles();

  await db.user.updateMany({
    where: { role: SYSTEM_ROLE_SLUGS.admin, roleId: null },
    data: { roleId: admin.id },
  });
  await db.user.updateMany({
    where: { role: SYSTEM_ROLE_SLUGS.surveyor, roleId: null },
    data: { roleId: surveyor.id },
  });
  await db.user.updateMany({
    where: { role: SYSTEM_ROLE_SLUGS.portfolio, roleId: null },
    data: { roleId: portfolio.id },
  });
  await db.user.updateMany({
    where: {
      OR: [{ role: SYSTEM_ROLE_SLUGS.cx }, { roleId: null }],
      NOT: {
        role: {
          in: [
            SYSTEM_ROLE_SLUGS.admin,
            SYSTEM_ROLE_SLUGS.surveyor,
            SYSTEM_ROLE_SLUGS.portfolio,
          ],
        },
      },
    },
    data: { roleId: cx.id, role: SYSTEM_ROLE_SLUGS.cx },
  });
}

export async function getUserPermissionSet(userId: string): Promise<Set<Permission>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      roleId: true,
      roleRef: {
        select: {
          slug: true,
          permissions: { select: { permission: true } },
        },
      },
    },
  });

  if (!user) return new Set();
  return resolvePermissionSet(user);
}

/**
 * A role assignment is authoritative: a custom role with zero permission rows
 * grants nothing. The legacy `user.role` fallback applies only to users that
 * predate role assignment (`roleId` null) and hold a known system slug.
 */
export function resolvePermissionSet(user: {
  role: string;
  roleId: string | null;
  roleRef: { slug: string; permissions: { permission: string }[] } | null;
}): Set<Permission> {
  // System roles are not editable, so their canonical set always wins over
  // stored rows. This keeps new permissions (e.g. testimonials.manage) from
  // being hidden by a role row synced before the permission existed.
  const systemSlug = user.roleRef?.slug ?? (user.roleId ? null : user.role);
  if (systemSlug === SYSTEM_ROLE_SLUGS.admin) return new Set(ADMIN_PERMISSIONS);
  if (systemSlug === SYSTEM_ROLE_SLUGS.cx) return new Set(OPERATIONAL_PERMISSIONS);
  if (systemSlug === SYSTEM_ROLE_SLUGS.surveyor) return new Set(SURVEYOR_PERMISSIONS);
  if (systemSlug === SYSTEM_ROLE_SLUGS.portfolio) {
    return new Set(PORTFOLIO_PERMISSIONS);
  }

  if (user.roleRef) {
    return new Set(
      user.roleRef.permissions
        .map((row) => row.permission)
        .filter((value): value is Permission =>
          (PERMISSIONS as readonly string[]).includes(value)
        )
    );
  }

  if (user.roleId) return new Set();

  if (user.role === SYSTEM_ROLE_SLUGS.admin) {
    return new Set(ADMIN_PERMISSIONS);
  }
  if (user.role === SYSTEM_ROLE_SLUGS.surveyor) {
    return new Set(SURVEYOR_PERMISSIONS);
  }
  if (user.role === SYSTEM_ROLE_SLUGS.portfolio) {
    return new Set(PORTFOLIO_PERMISSIONS);
  }
  if (user.role === SYSTEM_ROLE_SLUGS.cx) {
    return new Set(OPERATIONAL_PERMISSIONS);
  }

  return new Set();
}

export async function userHasPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  const permissions = await getUserPermissionSet(userId);
  return permissions.has(permission);
}

export function digestIp(ip: string | null | undefined) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!ip || !secret) return null;
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex").slice(0, 32);
}
