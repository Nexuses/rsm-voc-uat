import MetricReportView from "@/components/dashboard/MetricReportView";
import { requirePagePermission } from "@/lib/dashboard-page-gate";

export default async function CsatReportPage() {
  await requirePagePermission("dashboard.reports");
  return <MetricReportView metric="csat" />;
}
