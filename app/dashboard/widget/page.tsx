import PublicWidgetEmbed from "@/components/dashboard/PublicWidgetEmbed";
import styles from "@/components/dashboard/dashboard.module.css";
import { requirePagePermission } from "@/lib/dashboard-page-gate";

export default async function DashboardWidgetPage() {
  await requirePagePermission("dashboard.widget");
  return (
    <>
      <header className={styles.topbar}>
        <div>
          <span>Public embed</span>
          <h1>Website widgets</h1>
        </div>
      </header>
      <PublicWidgetEmbed />
    </>
  );
}
