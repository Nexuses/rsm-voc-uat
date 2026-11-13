import type { Permission } from "@/lib/rbac/permissions";

/**
 * Any of these unlocks Settings. `settings.account` is enough for Account /
 * password change (portfolio partners). Directory and admin tabs use stricter
 * checks below.
 */
export const SETTINGS_GATE_PERMISSIONS: Permission[] = [
  "settings.account",
  "users.manage",
  "roles.manage",
  "audit.read",
];

/** Who may view/edit the survey staff directory (not portfolio-only). */
export const SETTINGS_DIRECTORY_PERMISSIONS: Permission[] = [
  "invite.send",
  "users.manage",
  "roles.manage",
  "audit.read",
];

export const SETTINGS_TABS: Array<{
  href: string;
  label: string;
  /** Single required permission; ignored when `anyOf` is set. */
  permission: Permission | null;
  /** If set, user needs any one of these (takes precedence over `permission`). */
  anyOf?: Permission[];
}> = [
  {
    href: "/dashboard/settings/account",
    label: "Account",
    permission: null,
  },
  {
    href: "/dashboard/settings/directory",
    label: "Directory",
    permission: null,
    anyOf: SETTINGS_DIRECTORY_PERMISSIONS,
  },
  {
    href: "/dashboard/settings/users",
    label: "Users",
    permission: "users.manage",
  },
  {
    href: "/dashboard/settings/roles",
    label: "Roles",
    permission: "roles.manage",
  },
  {
    href: "/dashboard/settings/audit",
    label: "Audit",
    permission: "audit.read",
  },
  {
    href: "/dashboard/settings/reminders",
    label: "Reminders",
    permission: "users.manage",
  },
];

export function canAccessSettings(permissions: Permission[]): boolean {
  return SETTINGS_GATE_PERMISSIONS.some((permission) =>
    permissions.includes(permission)
  );
}

export function canSeeSettingsTab(
  tab: (typeof SETTINGS_TABS)[number],
  permissions: Permission[]
): boolean {
  const allowed = new Set(permissions);
  if (tab.anyOf?.length) {
    return tab.anyOf.some((permission) => allowed.has(permission));
  }
  if (tab.permission === null) return true;
  return allowed.has(tab.permission);
}

export function firstSettingsHref(permissions: Permission[]): string | null {
  if (!canAccessSettings(permissions)) return null;
  const tab = SETTINGS_TABS.find((item) => canSeeSettingsTab(item, permissions));
  return tab?.href ?? null;
}
