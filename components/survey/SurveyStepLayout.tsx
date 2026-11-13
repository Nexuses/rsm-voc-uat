import type { ReactNode } from "react";
import { RSM_BRAND_NAME, RSM_WHITE_LOGO_URL } from "@/lib/brand";
import type { SurveyVoiceLanguage } from "@/lib/survey/voice-locale";
import styles from "./survey.module.css";

export type SurveyIdentityPreview = {
  name: string;
  role: string;
  company: string;
  email: string;
  complete: boolean;
};

type SurveyStepLayoutProps = {
  step: number;
  totalSteps: number;
  progressLabel: string;
  stepPill: string;
  durationLabel?: string;
  heading: string;
  /** DOM id for the left-panel heading. Used when the step has no separate
   * right-panel question, so `aria-labelledby` still resolves. */
  headingId?: string;
  /** Optional line shown under the heading (e.g. the metric's full name). */
  subheading?: string;
  introBody: string;
  brandTitle: string;
  brandSubtitle: string;
  language?: SurveyVoiceLanguage;
  identityPreview?: SurveyIdentityPreview | null;
  children: ReactNode;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

export default function SurveyStepLayout({
  step,
  progressLabel,
  stepPill,
  durationLabel,
  heading,
  headingId,
  subheading,
  introBody,
  brandTitle,
  brandSubtitle,
  identityPreview,
  children,
}: SurveyStepLayoutProps) {
  const initials = identityPreview ? initialsFromName(identityPreview.name) : "";

  return (
    <div className={styles.splitLayout}>
      <aside
        className={styles.splitLeft}
        aria-label={progressLabel}
        key={`left-${step}`}
      >
        <div className={styles.splitBrand}>
          <img
            src={RSM_WHITE_LOGO_URL}
            alt={RSM_BRAND_NAME}
            className={styles.splitLogo}
          />
          <span className={styles.splitBrandLockup}>
            <strong>{brandTitle}</strong>
            <span>{brandSubtitle}</span>
          </span>
        </div>

        <div className={styles.splitIntroCopy}>
          <div className={styles.splitMeta}>
            <span className={styles.splitStepBadge}>
              <span aria-hidden="true">
                {String(step + 1).padStart(2, "0")}
              </span>
              <span className={styles.visuallyHidden}>{stepPill}</span>
            </span>
            {durationLabel ? (
              <span className={styles.splitDuration}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                {durationLabel}
              </span>
            ) : null}
          </div>
          <h2 className={styles.splitTitle} id={headingId}>
            {heading}
          </h2>
          {subheading ? (
            <p className={styles.splitSubheading}>{subheading}</p>
          ) : null}
          {introBody ? (
            <p className={styles.splitBody}>{introBody}</p>
          ) : null}
        </div>

        {identityPreview ? (
          <div className={styles.splitPreview} aria-hidden="true">
            <div
              className={`${styles.previewCard} ${
                identityPreview.complete ? styles.previewCardComplete : ""
              }`}
            >
              <span
                className={`${styles.previewAvatar} ${
                  initials ? styles.previewAvatarHas : ""
                }`}
              >
                {initials ? (
                  <span>{initials}</span>
                ) : (
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
                  </svg>
                )}
              </span>
              <div className={styles.previewText}>
                <span
                  className={styles.previewLine}
                  style={{ ["--w" as string]: "150px" }}
                >
                  {identityPreview.name}
                </span>
                <span className={styles.previewRole}>
                  <span
                    className={styles.previewLine}
                    style={{ ["--w" as string]: "80px" }}
                  >
                    {identityPreview.role}
                  </span>
                  <span
                    className={styles.previewLine}
                    style={{ ["--w" as string]: "100px" }}
                  >
                    {identityPreview.company}
                  </span>
                </span>
                <span className={styles.previewMail}>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="14" />
                    <path d="M3 7l9 7 9-7" />
                  </svg>
                  <span
                    className={styles.previewLine}
                    style={{ ["--w" as string]: "170px" }}
                  >
                    {identityPreview.email}
                  </span>
                </span>
              </div>
              <span className={styles.previewCheck}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
            </div>
          </div>
        ) : null}
      </aside>

      <div className={styles.splitRight} key={`panel-${step}`}>
        {children}
      </div>
    </div>
  );
}
