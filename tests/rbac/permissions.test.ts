import { describe, expect, it } from "vitest";
import {
  ADMIN_PERMISSIONS,
  OPERATIONAL_PERMISSIONS,
  PORTFOLIO_PERMISSIONS,
  SURVEYOR_PERMISSIONS,
  permissionForDashboardPath,
} from "@/lib/rbac/permissions";

describe("RBAC permissions catalog", () => {
  it("gives admin more permissions than cx operations", () => {
    expect(ADMIN_PERMISSIONS).toEqual(
      expect.arrayContaining(OPERATIONAL_PERMISSIONS)
    );
    expect(ADMIN_PERMISSIONS).toEqual(
      expect.arrayContaining([
        "users.manage",
        "roles.manage",
        "responses.manage",
      ])
    );
    expect(OPERATIONAL_PERMISSIONS).not.toContain("roles.manage");
    expect(OPERATIONAL_PERMISSIONS).not.toContain("responses.manage");
    expect(OPERATIONAL_PERMISSIONS).not.toContain("testimonials.manage");
    expect(ADMIN_PERMISSIONS).toContain("testimonials.manage");
    expect(OPERATIONAL_PERMISSIONS).toContain("dashboard.leaderboard");
  });

  it("limits surveyor to invite send and tracker", () => {
    expect(SURVEYOR_PERMISSIONS).toEqual(["invite.send", "invite.tracker"]);
    expect(SURVEYOR_PERMISSIONS).not.toContain("dashboard.responses");
    expect(SURVEYOR_PERMISSIONS).not.toContain("responses.manage");
  });

  it("limits portfolio to read own attributed CX data plus password change", () => {
    expect(PORTFOLIO_PERMISSIONS).toEqual([
      "dashboard.overview",
      "dashboard.reports",
      "dashboard.responses",
      "dashboard.insights",
      "invite.tracker",
      "cases.read",
      "settings.account",
    ]);
    expect(PORTFOLIO_PERMISSIONS).not.toContain("dashboard.leaderboard");
    expect(PORTFOLIO_PERMISSIONS).not.toContain("invite.send");
    expect(PORTFOLIO_PERMISSIONS).not.toContain("testimonials.manage");
    expect(PORTFOLIO_PERMISSIONS).not.toContain("users.manage");
  });

  it("maps dashboard paths to permissions", () => {
    expect(permissionForDashboardPath("/dashboard")).toBe("dashboard.overview");
    expect(permissionForDashboardPath("/dashboard/leaderboard")).toBe(
      "dashboard.leaderboard"
    );
    expect(permissionForDashboardPath("/dashboard/responses")).toBe(
      "dashboard.responses"
    );
    expect(permissionForDashboardPath("/dashboard/testimonials")).toBe(
      "testimonials.manage"
    );
    expect(permissionForDashboardPath("/dashboard/escalations")).toBe(
      "cases.read"
    );
    expect(permissionForDashboardPath("/dashboard/invite")).toBe("invite.send");
    expect(permissionForDashboardPath("/dashboard/invite-tracker")).toBe(
      "invite.tracker"
    );
    expect(permissionForDashboardPath("/dashboard/settings/roles")).toBe(
      "roles.manage"
    );
    expect(permissionForDashboardPath("/dashboard/settings/audit")).toBe(
      "audit.read"
    );
    expect(permissionForDashboardPath("/dashboard/settings")).toBeNull();
    expect(permissionForDashboardPath("/dashboard/settings/account")).toBeNull();
    expect(permissionForDashboardPath("/dashboard/audit")).toBe("audit.read");
  });
});
