import SurveyInviteTracker from "@/components/dashboard/SurveyInviteTracker";
import { requirePagePermission } from "@/lib/dashboard-page-gate";

export default async function DashboardInviteTrackerPage() {
  await requirePagePermission("invite.tracker");
  return <SurveyInviteTracker />;
}
