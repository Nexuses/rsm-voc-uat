import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CxAuthError,
  getSessionPermissions,
  requireCxUser,
} from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { dashboardFallbackPath } from "@/lib/dashboard-page-gate";
import { permissionForDashboardPath } from "@/lib/rbac/permissions";
import {
  DATABASE_UNAVAILABLE_MESSAGE,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import styles from "@/components/dashboard/dashboard.module.css";

export default async function DashboardLayout({
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
      redirect("/login?callbackUrl=/dashboard");
    }
    if (isTransientPrismaError(error)) {
      return (
        <main className="min-h-screen bg-[#f6f6f6] px-3 py-4 sm:px-7 sm:py-7">
          <div className={styles.dashboardDbNotice} role="alert">
            <h1>Database waking up</h1>
            <p>
              {DATABASE_UNAVAILABLE_MESSAGE} Neon may take a few seconds after
              idle — refresh to continue.
            </p>
            <Link href="/dashboard" className={styles.dashboardDbNoticeAction}>
              Retry dashboard
            </Link>
          </div>
        </main>
      );
    }
    throw error;
  }

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const required = pathname
    ? permissionForDashboardPath(pathname)
    : null;

  if (required && !permissions.includes(required)) {
    redirect(dashboardFallbackPath(permissions));
  }

  return (
    <main className="min-h-screen bg-[#f6f6f6] px-3 py-4 sm:px-7 sm:py-7">
      <DashboardShell permissions={permissions}>{children}</DashboardShell>
    </main>
  );
}
