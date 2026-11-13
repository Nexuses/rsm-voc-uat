import {
  METRIC_IDENTITY_COLORS,
  metricBand,
  type MetricBand,
} from "@/lib/rating-visuals";
import styles from "./survey.module.css";

export type ReviewMetricSummary = {
  metric: "csat" | "ces" | "nps";
  /** Full metric name plus acronym, e.g. "Client Satisfaction Score (CSAT)". */
  title: string;
  score: number | null;
  min: number;
  max: number;
  /** Band label for the chosen score, e.g. "Satisfied". */
  label: string;
  comment: string;
};

type SurveyReviewSummaryProps = {
  respondentLabel: string;
  fullName: string;
  email: string;
  company: string;
  designation: string;
  noComment: string;
  metrics: ReviewMetricSummary[];
};

/**
 * The same metric illustrations used by the CX PDF reports and the dashboard
 * metric logos (`public/metrics/*.png`, 512px, transparent).
 */
const METRIC_ART: Record<ReviewMetricSummary["metric"], string> = {
  csat: "/metrics/csat.png",
  ces: "/metrics/ces.png",
  nps: "/metrics/nps.png",
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const first = Array.from(parts[0])[0] ?? "";
  const last =
    parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

/**
 * Review step summary: respondent card plus one card per metric, using the CX
 * report illustrations so the summary matches the client-facing PDFs.
 */
export default function SurveyReviewSummary({
  respondentLabel,
  fullName,
  email,
  company,
  designation,
  noComment,
  metrics,
}: SurveyReviewSummaryProps) {
  const initials = initialsFromName(fullName);

  return (
    <div className={styles.reviewSummary}>
      <section className={styles.reviewIdentity} aria-label={respondentLabel}>
        <span className={styles.reviewAvatar} aria-hidden="true">
          {initials || "—"}
        </span>
        <div className={styles.reviewIdentityText}>
          <span className={styles.reviewEyebrow}>{respondentLabel}</span>
          <strong className={styles.reviewName}>{fullName}</strong>
          <p className={styles.reviewMeta}>
            {[designation, company].filter(Boolean).join(" · ")}
          </p>
          <span className={styles.reviewEmail}>{email}</span>
        </div>
      </section>

      <div className={styles.reviewMetrics}>
        {metrics.map((metric) => {
          const band: MetricBand | null =
            metric.score === null ? null : metricBand(metric.metric, metric.score);
          return (
            <article
              key={metric.metric}
              className={styles.reviewCard}
              data-metric={metric.metric}
              aria-label={metric.title}
              style={
                {
                  "--metric-color": METRIC_IDENTITY_COLORS[metric.metric],
                } as React.CSSProperties
              }
            >
              <h4 className={styles.reviewCardTitle}>{metric.title}</h4>

              <div className={styles.reviewCardArt}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static brand artwork; fixed 512px source */}
                <img
                  src={METRIC_ART[metric.metric]}
                  alt=""
                  width={512}
                  height={512}
                  decoding="async"
                  aria-hidden="true"
                />
              </div>

              <p className={styles.reviewScore}>
                <strong>{metric.score === null ? "–" : metric.score}</strong>
                <span>/ {metric.max}</span>
              </p>

              {band && metric.label ? (
                <p className={styles.reviewBand} data-band={band}>
                  {metric.label}
                </p>
              ) : null}

              <p
                className={styles.reviewComment}
                data-empty={metric.comment ? undefined : "true"}
              >
                {metric.comment || noComment}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
