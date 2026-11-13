import DashboardOverview from "@/components/dashboard/DashboardOverview";
import { requirePagePermission } from "@/lib/dashboard-page-gate";

export default async function DashboardPage() {
  await requirePagePermission("dashboard.overview");
  return <DashboardOverview />;
}
