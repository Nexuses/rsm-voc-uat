import { redirect } from "next/navigation";
import DashboardDirectory from "@/components/dashboard/DashboardDirectory";
import {
  CxAuthError,
  getSessionPermissions,
  requireCxUser,
} from "@/lib/auth";
import {
  canSeeSettingsTab,
  firstSettingsHref,
  SETTINGS_TABS,
} from "@/lib/rbac/settings-tabs";

export default async function DirectorySettingsPage() {
  let permissions: Awaited<ReturnType<typeof getSessionPermissions>> = [];
  try {
    const session = await requireCxUser();
    permissions = await getSessionPermissions(session);
  } catch (error) {
    if (error instanceof CxAuthError) {
      redirect("/login?callbackUrl=/dashboard/settings/directory");
    }
    throw error;
  }

  const directoryTab = SETTINGS_TABS.find(
    (tab) => tab.href === "/dashboard/settings/directory"
  )!;
  if (!canSeeSettingsTab(directoryTab, permissions)) {
    redirect(firstSettingsHref(permissions) ?? "/dashboard");
  }

  return <DashboardDirectory />;
}
