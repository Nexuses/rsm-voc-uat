import MetricReportView from "@/components/dashboard/MetricReportView";
import { requirePagePermission } from "@/lib/dashboard-page-gate";

export default async function CesReportPage() {
  await requirePagePermission("dashboard.reports");
  return <MetricReportView metric="ces" />;
}
