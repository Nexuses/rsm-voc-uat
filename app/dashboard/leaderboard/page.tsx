import DashboardLeaderboard from "@/components/dashboard/DashboardLeaderboard";
import { requirePagePermission } from "@/lib/dashboard-page-gate";

export default async function LeaderboardPage() {
  await requirePagePermission("dashboard.leaderboard");
  return <DashboardLeaderboard />;
}
