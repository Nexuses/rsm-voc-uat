import { describe, expect, it } from "vitest";
import {
  decideRolePermissionEdit,
  decideUserRoleAssignment,
  permissionsBeyondActor,
} from "@/lib/rbac/guards";
import {
  ADMIN_PERMISSIONS,
  OPERATIONAL_PERMISSIONS,
  type Permission,
} from "@/lib/rbac/permissions";
import { resolvePermissionSet } from "@/lib/rbac/roles";

const rolesOnly: Permission[] = ["roles.manage", "dashboard.overview"];

describe("role permission edit guard", () => {
  it("rejects permission edits on system roles", () => {
    const decision = decideRolePermissionEdit({
      isSystemRole: true,
      actorPermissions: ADMIN_PERMISSIONS,
      requestedPermissions: ["dashboard.overview"],
    });
    expect(decision).toMatchObject({ ok: false, status: 400 });
  });

  it("blocks a roles.manage holder from granting users.manage", () => {
    const decision = decideRolePermissionEdit({
      isSystemRole: false,
      actorPermissions: rolesOnly,
      requestedPermissions: ["roles.manage", "users.manage"],
    });
    expect(decision).toMatchObject({ ok: false, status: 403 });
  });

  it("allows granting a subset of the actor's own permissions", () => {
    const decision = decideRolePermissionEdit({
      isSystemRole: false,
      actorPermissions: rolesOnly,
      requestedPermissions: ["dashboard.overview"],
    });
    expect(decision).toEqual({ ok: true });
  });

  it("lists only permissions the actor lacks", () => {
    expect(
      permissionsBeyondActor(rolesOnly, ["dashboard.overview", "audit.read", "audit.read"])
    ).toEqual(["audit.read"]);
  });
});

describe("user role assignment guard", () => {
  const base = {
    actorUserId: "actor",
    targetUserId: "target",
    actorPermissions: ADMIN_PERMISSIONS,
    rolePermissions: OPERATIONAL_PERMISSIONS as string[],
    targetCurrentlyAdmin: false,
    newRoleIsAdmin: false,
    adminCount: 2,
  };

  it("blocks changing your own role", () => {
    expect(
      decideUserRoleAssignment({ ...base, targetUserId: "actor" })
    ).toMatchObject({ ok: false, status: 403 });
  });

  it("blocks assigning a role broader than the actor", () => {
    expect(
      decideUserRoleAssignment({
        ...base,
        actorPermissions: ["users.manage"],
        rolePermissions: ADMIN_PERMISSIONS,
      })
    ).toMatchObject({ ok: false, status: 403 });
  });

  it("keeps at least one administrator", () => {
    expect(
      decideUserRoleAssignment({
        ...base,
        targetCurrentlyAdmin: true,
        adminCount: 1,
      })
    ).toMatchObject({ ok: false, status: 409 });
    expect(
      decideUserRoleAssignment({ ...base, targetCurrentlyAdmin: true, adminCount: 2 })
    ).toEqual({ ok: true });
  });
});

describe("resolvePermissionSet fails closed", () => {
  it("grants nothing for an assigned custom role with zero permission rows", () => {
    const set = resolvePermissionSet({
      role: "custom-empty",
      roleId: "role-1",
      roleRef: { slug: "custom-empty", permissions: [] },
    });
    expect(set.size).toBe(0);
  });

  it("grants nothing when roleId points at a missing role", () => {
    expect(
      resolvePermissionSet({ role: "admin", roleId: "gone", roleRef: null }).size
    ).toBe(0);
  });

  it("ignores unknown permission strings on a role", () => {
    const set = resolvePermissionSet({
      role: "custom",
      roleId: "r",
      roleRef: {
        slug: "custom",
        permissions: [{ permission: "dashboard.overview" }, { permission: "root" }],
      },
    });
    expect([...set]).toEqual(["dashboard.overview"]);
  });

  it("gives system roles their canonical set even when stored rows are stale", () => {
    const staleAdmin = resolvePermissionSet({
      role: "admin",
      roleId: "role-admin",
      roleRef: {
        slug: "admin",
        permissions: [{ permission: "dashboard.overview" }],
      },
    });
    expect(staleAdmin.has("testimonials.manage")).toBe(true);

    const staleCx = resolvePermissionSet({
      role: "cx",
      roleId: "role-cx",
      roleRef: {
        slug: "cx",
        permissions: [{ permission: "testimonials.manage" }],
      },
    });
    expect(staleCx.has("testimonials.manage")).toBe(false);
    expect(staleCx.has("dashboard.overview")).toBe(true);
  });

  it("keeps legacy system slugs for users without a role assignment", () => {
    expect(
      resolvePermissionSet({ role: "admin", roleId: null, roleRef: null }).has(
        "users.manage"
      )
    ).toBe(true);
    expect(
      resolvePermissionSet({ role: "unknown", roleId: null, roleRef: null }).size
    ).toBe(0);
  });
});
