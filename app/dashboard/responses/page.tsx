import DashboardResponses from "@/components/dashboard/DashboardResponses";
import { requirePagePermission } from "@/lib/dashboard-page-gate";

export default async function DashboardResponsesPage() {
  await requirePagePermission("dashboard.responses");
  return <DashboardResponses />;
}
