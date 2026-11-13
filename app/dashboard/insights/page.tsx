import InsightsChat from "@/components/dashboard/InsightsChat";
import { requirePagePermission } from "@/lib/dashboard-page-gate";

export default async function DashboardInsightsPage() {
  await requirePagePermission("dashboard.insights");
  return <InsightsChat />;
}
