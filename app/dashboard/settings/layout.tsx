import { redirect } from "next/navigation";
import {
  CxAuthError,
  getSessionPermissions,
  requireCxUser,
} from "@/lib/auth";
import DashboardSettingsShell from "@/components/dashboard/DashboardSettingsShell";
import { firstSettingsHref } from "@/lib/rbac/settings-tabs";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let permissions: Awaited<ReturnType<typeof getSessionPermissions>> = [];

  try {
    const session = await requireCxUser();
    permissions = await getSessionPermissions(session);
  } catch (error) {
    if (error instanceof CxAuthError) {
      redirect("/login?callbackUrl=/dashboard/settings");
    }
    throw error;
  }

  const entry = firstSettingsHref(permissions);
  if (!entry) {
    redirect("/dashboard");
  }

  return (
    <DashboardSettingsShell permissions={permissions}>
      {children}
    </DashboardSettingsShell>
  );
}
