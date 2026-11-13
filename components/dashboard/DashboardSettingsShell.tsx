"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Permission } from "@/lib/rbac/permissions";
import { canSeeSettingsTab, SETTINGS_TABS } from "@/lib/rbac/settings-tabs";
import styles from "./dashboard.module.css";

type DashboardSettingsShellProps = {
  children: ReactNode;
  permissions: Permission[];
};

export default function DashboardSettingsShell({
  children,
  permissions,
}: DashboardSettingsShellProps) {
  const pathname = usePathname();
  const tabs = SETTINGS_TABS.filter((tab) =>
    canSeeSettingsTab(tab, permissions)
  );

  return (
    <section className={styles.settingsPage} aria-label="Settings">
      <header className={styles.panelHeading}>
        <h2>Settings</h2>
        <p>
          Change your password, maintain the survey directory, manage users and
          roles, and review the platform audit log.
        </p>
      </header>

      {tabs.length ? (
        <nav className={styles.settingsTabs} aria-label="Settings sections">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  isActive ? styles.settingsTabActive : styles.settingsTab
                }
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <div className={styles.settingsTabPanel}>{children}</div>
    </section>
  );
}
