import Link from "next/link";
import SurveyInviteForm from "@/components/dashboard/SurveyInviteForm";
import styles from "@/components/dashboard/dashboard.module.css";
import { requirePagePermission } from "@/lib/dashboard-page-gate";
import { getSurveyInviteDefaults } from "@/lib/survey-invite-email";
import { listInviteFieldSuggestions } from "@/lib/survey-staff-contacts";

export default async function DashboardInvitePage() {
  await requirePagePermission("invite.send");
  const defaults = getSurveyInviteDefaults();
  const suggestions = await listInviteFieldSuggestions();

  return (
    <>
      <header className={styles.topbar}>
        <div>
          <span>Client outreach</span>
          <h1>Send survey</h1>
        </div>
        <div className={styles.topbarActions}>
          <Link className={styles.invitePageLink} href="/dashboard/invite-tracker">
            Invite tracker
          </Link>
        </div>
      </header>
      <SurveyInviteForm defaults={defaults} suggestions={suggestions} />
    </>
  );
}
