import { buildAuthzContext } from "@/lib/authz";
import { db } from "@/lib/db";
import type { Permission } from "@/lib/rbac/permissions";
import { resolvePermissionSet } from "@/lib/rbac/roles";

/**
 * Active users holding `permission` who may see `accountId`. Scoped users are
 * only included when the account is directly in their scope.
 */
export async function usersWithPermission(permission: Permission, accountId: string | null) {
  const users = await db.user.findMany({
    where: { disabledAt: null },
    select: {
      id: true,
      role: true,
      roleId: true,
      roleRef: { select: { slug: true, permissions: { select: { permission: true } } } },
      scopes: { select: { scopeType: true, scopeId: true } },
    },
  });
  return users
    .filter((user) => resolvePermissionSet(user).has(permission))
    .filter((user) => {
      const ctx = buildAuthzContext({ userId: user.id, permissions: [], scopes: user.scopes });
      if (ctx.unrestricted) return true;
      return accountId ? ctx.accountIds.includes(accountId) : false;
    })
    .map((user) => user.id);
}
