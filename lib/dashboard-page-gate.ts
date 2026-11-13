import { redirect } from "next/navigation";
import {
  CxAuthError,
  getSessionPermissions,
  requireCxUser,
} from "@/lib/auth";
import type { Permission } from "@/lib/rbac/permissions";

export function dashboardFallbackPath(permissions: Permission[]) {
  if (permissions.includes("dashboard.overview")) return "/dashboard";
  if (permissions.includes("invite.send")) return "/dashboard/invite";
  if (permissions.includes("invite.tracker")) return "/dashboard/invite-tracker";
  return "/login";
}

/**
 * Per-page server gate. Layouts do not re-render on client-side navigation,
 * so every permission-scoped dashboard page calls this itself.
 */
export async function requirePagePermission(
  permission: Permission | Permission[]
): Promise<Permission[]> {
  let permissions: Permission[];
  try {
    const session = await requireCxUser();
    permissions = await getSessionPermissions(session);
  } catch (error) {
    if (error instanceof CxAuthError) redirect("/login?callbackUrl=/dashboard");
    throw error;
  }
  const required = Array.isArray(permission) ? permission : [permission];
  if (!required.some((value) => permissions.includes(value))) {
    redirect(dashboardFallbackPath(permissions));
  }
  return permissions;
}
