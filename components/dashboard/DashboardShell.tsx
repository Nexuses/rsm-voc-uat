"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import RsmLogo from "@/components/RsmLogo";
import { DashboardInsightsProvider } from "@/components/dashboard/DashboardInsightsProvider";
import { DashboardPermissionsProvider } from "@/components/dashboard/DashboardPermissions";
import VoiceCreditsBanner from "@/components/dashboard/VoiceCreditsBanner";
import type { Permission } from "@/lib/rbac/permissions";
import { OPERATIONAL_PERMISSIONS } from "@/lib/rbac/permissions";
import { SETTINGS_GATE_PERMISSIONS } from "@/lib/rbac/settings-tabs";
import styles from "./dashboard.module.css";

type NavItem = {
  href: string;
  label: string;
  exact: boolean;
  permission?: Permission;
  anyOf?: Permission[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", exact: true, permission: "dashboard.overview" },
  {
    href: "/dashboard/reports/csat",
    label: "CSAT report",
    exact: false,
    permission: "dashboard.reports",
  },
  {
    href: "/dashboard/reports/nps",
    label: "NPS report",
    exact: false,
    permission: "dashboard.reports",
  },
  {
    href: "/dashboard/reports/ces",
    label: "CES report",
    exact: false,
    permission: "dashboard.reports",
  },
  {
    href: "/dashboard/responses",
    label: "Responses",
    exact: false,
    permission: "dashboard.responses",
  },
  {
    href: "/dashboard/testimonials",
    label: "Testimonials",
    exact: false,
    permission: "testimonials.manage",
  },
  {
    href: "/dashboard/escalations",
    label: "Escalations",
    exact: false,
    permission: "cases.read",
  },
  {
    href: "/dashboard/widget",
    label: "Widget",
    exact: false,
    permission: "dashboard.widget",
  },
  {
    href: "/dashboard/invite",
    label: "Send survey",
    exact: true,
    permission: "invite.send",
  },
  {
    href: "/dashboard/invite-tracker",
    label: "Invite tracker",
    exact: false,
    permission: "invite.tracker",
  },
  {
    href: "/dashboard/insights",
    label: "Insights",
    exact: false,
    permission: "dashboard.insights",
  },
  {
    href: "/dashboard/leaderboard",
    label: "Leaderboard",
    exact: false,
    permission: "dashboard.leaderboard",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    exact: false,
    anyOf: SETTINGS_GATE_PERMISSIONS,
  },
];

function canSeeNavItem(item: NavItem, allowed: Set<Permission>) {
  if (item.anyOf?.length) {
    return item.anyOf.some((permission) => allowed.has(permission));
  }
  if (item.permission) {
    return allowed.has(item.permission);
  }
  return false;
}

type DashboardShellProps = {
  children: ReactNode;
  permissions?: Permission[];
};

export default function DashboardShell({
  children,
  permissions = OPERATIONAL_PERMISSIONS,
}: DashboardShellProps) {
  const pathname = usePathname();
  const navId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const flush = pathname.startsWith("/dashboard/insights");
  const allowed = new Set(permissions);
  const visibleNav = navItems.filter((item) => canSeeNavItem(item, allowed));

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <div className={styles.dashboard}>
      <aside
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarMenuOpen : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.brand}>
            <RsmLogo className={styles.brandLogo} />
            <span>
              <small>RSM in Kuwait</small>
              <strong>CX Intelligence</strong>
            </span>
          </div>
          <button
            type="button"
            className={styles.navMenuButton}
            aria-expanded={menuOpen}
            aria-controls={navId}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span
              className={`${styles.navMenuIcon} ${
                menuOpen ? styles.navMenuIconOpen : ""
              }`}
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
        <nav id={navId} aria-label="Dashboard sections">
          {visibleNav.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <Link className={styles.surveyLinkMobile} href="/survey">
            Open client survey
          </Link>
        </nav>
        <Link className={styles.surveyLink} href="/survey">
          Open client survey
        </Link>
      </aside>

      <main
        className={
          flush ? `${styles.workspace} ${styles.workspaceFlush}` : styles.workspace
        }
      >
        <DashboardPermissionsProvider permissions={permissions}>
          {!flush ? <VoiceCreditsBanner /> : null}
          <DashboardInsightsProvider>{children}</DashboardInsightsProvider>
        </DashboardPermissionsProvider>
      </main>
    </div>
  );
}
