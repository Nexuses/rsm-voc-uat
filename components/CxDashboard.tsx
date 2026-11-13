"use client";

import DashboardOverview from "@/components/dashboard/DashboardOverview";
import DashboardShell from "@/components/dashboard/DashboardShell";

/** @deprecated Use dashboard route pages with DashboardShell instead. */
export default function CxDashboard() {
  return (
    <DashboardShell>
      <DashboardOverview />
    </DashboardShell>
  );
}
