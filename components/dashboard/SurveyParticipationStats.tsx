import type { SurveyOutreachStats } from "@/lib/survey-outreach";
import {
  ParticipationCompletionIcon,
  ParticipationResponsesIcon,
  ParticipationVoiceIcon,
} from "@/components/dashboard/MetricIcons";
import styles from "./dashboard.module.css";

type SurveyParticipationStatsProps = {
  outreach: SurveyOutreachStats;
};

export default function SurveyParticipationStats({
  outreach,
}: SurveyParticipationStatsProps) {
  return (
    <section className={styles.participationStrip} aria-label="Survey outreach">
      <article className={styles.participationCard}>
        <ParticipationResponsesIcon className={styles.participationIcon} />
        <div className={styles.participationCopy}>
          <span className={styles.participationLabel}>Surveys sent</span>
          <strong className={styles.participationValue}>
            {outreach.surveysSent}
          </strong>
          <span className={styles.participationDetail}>
            Invitation emails in period
          </span>
        </div>
      </article>

      <article className={`${styles.participationCard} ${styles.participationCardVoice}`}>
        <ParticipationVoiceIcon className={styles.participationIcon} />
        <div className={styles.participationCopy}>
          <span className={styles.participationLabel}>Responses received</span>
          <strong className={styles.participationValue}>
            {outreach.responsesReceived}
          </strong>
          <span className={styles.participationDetail}>
            Completed surveys from sent invites
          </span>
        </div>
      </article>

      <article className={`${styles.participationCard} ${styles.participationCardCompletion}`}>
        <ParticipationCompletionIcon className={styles.participationIcon} />
        <div className={styles.participationCopy}>
          <span className={styles.participationLabel}>Response rate</span>
          <strong className={styles.participationValue}>
            {outreach.responseRate}%
          </strong>
          <span className={styles.participationDetail}>
            {outreach.opensTracked} opened · {outreach.startsTracked} started
          </span>
        </div>
      </article>
    </section>
  );
}
