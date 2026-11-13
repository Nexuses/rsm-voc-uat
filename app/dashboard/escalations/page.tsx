import DashboardEscalations from "@/components/dashboard/DashboardEscalations";
import { requirePagePermission } from "@/lib/dashboard-page-gate";

export default async function DashboardEscalationsPage() {
  await requirePagePermission("cases.read");
  return <DashboardEscalations />;
}
