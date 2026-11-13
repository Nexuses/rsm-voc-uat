import type { Permission } from "@/lib/rbac/permissions";

/** Permissions in `requested` that the actor does not hold. */
export function permissionsBeyondActor(
  actorPermissions: Iterable<Permission>,
  requested: Iterable<string>
): string[] {
  const held = new Set<string>(actorPermissions);
  return [...new Set(requested)].filter((permission) => !held.has(permission));
}

export type RoleGrantDecision =
  | { ok: true }
  | { ok: false; status: 400 | 403 | 409; error: string };

export function decideRolePermissionEdit(input: {
  isSystemRole: boolean;
  actorPermissions: Iterable<Permission>;
  requestedPermissions: string[];
}): RoleGrantDecision {
  if (input.isSystemRole) {
    return {
      ok: false,
      status: 400,
      error: "System role permissions are managed by the platform",
    };
  }
  const beyond = permissionsBeyondActor(
    input.actorPermissions,
    input.requestedPermissions
  );
  if (beyond.length) {
    return {
      ok: false,
      status: 403,
      error: `You cannot grant permissions you do not hold: ${beyond.join(", ")}`,
    };
  }
  return { ok: true };
}

export function decideUserRoleAssignment(input: {
  actorUserId: string;
  targetUserId: string;
  actorPermissions: Iterable<Permission>;
  rolePermissions: string[];
  targetCurrentlyAdmin: boolean;
  newRoleIsAdmin: boolean;
  adminCount: number;
}): RoleGrantDecision {
  if (input.actorUserId === input.targetUserId) {
    return { ok: false, status: 403, error: "You cannot change your own role" };
  }
  const beyond = permissionsBeyondActor(
    input.actorPermissions,
    input.rolePermissions
  );
  if (beyond.length) {
    return {
      ok: false,
      status: 403,
      error: "You cannot assign a role with permissions you do not hold",
    };
  }
  if (input.targetCurrentlyAdmin && !input.newRoleIsAdmin && input.adminCount <= 1) {
    return {
      ok: false,
      status: 409,
      error: "At least one administrator must remain",
    };
  }
  return { ok: true };
}
