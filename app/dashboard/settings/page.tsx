import { redirect } from "next/navigation";
import {
  CxAuthError,
  getSessionPermissions,
  requireCxUser,
} from "@/lib/auth";
import { firstSettingsHref } from "@/lib/rbac/settings-tabs";

export default async function SettingsIndexPage() {
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

  const href = firstSettingsHref(permissions) ?? "/dashboard";
  redirect(href);
}
