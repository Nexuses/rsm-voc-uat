export const PERMISSIONS = [
  "dashboard.overview",
  "dashboard.reports",
  "dashboard.responses",
  "dashboard.insights",
  "dashboard.widget",
  "dashboard.leaderboard",
  "invite.send",
  "invite.tracker",
  "audit.read",
  "settings.account",
  "responses.manage",
  "testimonials.manage",
  "users.manage",
  "roles.manage",
  "cases.read",
  "cases.manage",
  "accounts.read",
  "accounts.manage",
  "engagements.read",
  "engagements.manage",
  "surveys.manage",
  "surveys.publish",
  "automation.manage",
  "approvals.decide",
  "revenue.read",
  "training.manage",
  "integrations.manage",
  "benchmarks.manage",
  "platform.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard.overview": "Dashboard overview",
  "dashboard.reports": "CSAT / NPS / CES reports",
  "dashboard.responses": "Responses ledger and export",
  "dashboard.insights": "Insights chat",
  "dashboard.widget": "Public widget preview",
  "dashboard.leaderboard": "Dept / partner / manager leaderboard",
  "invite.send": "Send survey invitations",
  "invite.tracker": "Invite tracker, notes, and manual follow-up",
  "audit.read": "Audit log",
  "settings.account": "Change own password (Settings → Account)",
  "responses.manage": "Exclude or delete survey responses and invitations",
  "testimonials.manage": "Review and publish client testimonials",
  "users.manage": "Manage users and role assignment",
  "roles.manage": "Create and edit custom roles",
  "cases.read": "View recovery cases",
  "cases.manage": "Assign and update recovery cases",
  "accounts.read": "View client accounts",
  "accounts.manage": "Edit and merge client accounts",
  "engagements.read": "View engagements",
  "engagements.manage": "Edit engagements and milestones",
  "surveys.manage": "Draft and edit survey versions",
  "surveys.publish": "Publish and archive survey versions",
  "automation.manage": "Create and activate automation rules",
  "approvals.decide": "Approve or reject queued messages and changes",
  "revenue.read": "View account revenue",
  "training.manage": "Manage training rules, courses, and assignments",
  "integrations.manage": "Manage integrations and API keys",
  "benchmarks.manage": "Import and refresh benchmarks",
  "platform.manage": "Feature flags and background job recovery",
};

const ADMIN_ONLY_PERMISSIONS: Permission[] = [
  "users.manage",
  "roles.manage",
  "responses.manage",
  "testimonials.manage",
  "accounts.manage",
  "engagements.manage",
  "surveys.manage",
  "surveys.publish",
  "automation.manage",
  "approvals.decide",
  "revenue.read",
  "training.manage",
  "integrations.manage",
  "benchmarks.manage",
  "platform.manage",
];

/** CX Analyst: full ops except admin-only response edit and user/role admin. */
export const OPERATIONAL_PERMISSIONS: Permission[] = PERMISSIONS.filter(
  (permission) => !ADMIN_ONLY_PERMISSIONS.includes(permission)
);

/** Surveyor: send invites and use the tracker only. */
export const SURVEYOR_PERMISSIONS: Permission[] = [
  "invite.send",
  "invite.tracker",
];

/**
 * Partner / Job Manager portfolio: read own attributed invites and responses.
 * Data scope is enforced in lib/authz (staff-email), not via permissions alone.
 */
export const PORTFOLIO_PERMISSIONS: Permission[] = [
  "dashboard.overview",
  "dashboard.reports",
  "dashboard.responses",
  "dashboard.insights",
  "invite.tracker",
  "cases.read",
  "settings.account",
];

export const ADMIN_PERMISSIONS: Permission[] = [...PERMISSIONS];

export const SYSTEM_ROLE_SLUGS = {
  admin: "admin",
  cx: "cx",
  surveyor: "surveyor",
  portfolio: "portfolio",
} as const;

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

/** Map dashboard path prefixes to required permission. */
export function permissionForDashboardPath(pathname: string): Permission | null {
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return "dashboard.overview";
  }
  if (pathname.startsWith("/dashboard/leaderboard")) {
    return "dashboard.leaderboard";
  }
  if (pathname.startsWith("/dashboard/reports")) return "dashboard.reports";
  if (pathname.startsWith("/dashboard/responses")) return "dashboard.responses";
  if (pathname.startsWith("/dashboard/testimonials")) return "testimonials.manage";
  if (pathname.startsWith("/dashboard/escalations")) return "cases.read";
  if (pathname.startsWith("/dashboard/insights")) return "dashboard.insights";
  if (pathname.startsWith("/dashboard/widget")) return "dashboard.widget";
  if (pathname.startsWith("/dashboard/invite-tracker")) return "invite.tracker";
  if (pathname === "/dashboard/invite" || pathname.startsWith("/dashboard/invite/")) {
    return "invite.send";
  }
  if (pathname.startsWith("/dashboard/audit")) return "audit.read";
  if (pathname.startsWith("/dashboard/settings/users")) return "users.manage";
  if (pathname.startsWith("/dashboard/settings/roles")) return "roles.manage";
  if (pathname.startsWith("/dashboard/settings/audit")) return "audit.read";
  // Account + settings index: gated by settings layout (any settings permission)
  if (
    pathname === "/dashboard/settings" ||
    pathname === "/dashboard/settings/" ||
    pathname.startsWith("/dashboard/settings/account") ||
    pathname.startsWith("/dashboard/settings")
  ) {
    return null;
  }
  return null;
}
