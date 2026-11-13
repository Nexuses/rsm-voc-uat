import {
  getVoiceLocale,
  isRtlVoiceLanguage,
  type SurveyVoiceLanguage,
} from "@/lib/survey/voice-locale";
import styles from "./PrivacyNotice.module.css";

/**
 * Official RSM Kuwait privacy notice. The site-wide statement lives here rather
 * than in copy so the link can never drift from the published page.
 */
export const RSM_PRIVACY_NOTICE_URL =
  "https://www.rsm.global/kuwait/privacy-notice";

type PrivacyNoticeProps = {
  language?: SurveyVoiceLanguage;
  /** Extra class for the surrounding layout (e.g. under the login card). */
  className?: string;
};

/**
 * The single privacy statement shown across the public surfaces: the survey
 * (mode chooser, typed forms, voice survey, review, thank-you) and the login
 * page. It composes the existing confidentiality line with a link to the
 * official RSM privacy notice, so there is only one privacy sentence in use.
 */
export default function PrivacyNotice({
  language = "en",
  className,
}: PrivacyNoticeProps) {
  const copy = getVoiceLocale(language).shell;
  const rtl = isRtlVoiceLanguage(language);

  return (
    <aside
      className={`${styles.privacy} ${rtl ? styles.rtl : ""} ${className ?? ""}`.trim()}
      dir={rtl ? "rtl" : undefined}
    >
      {/* Icon sits inline with the copy so the text block stays optically
          centred; a separate flex item would push the paragraph off-centre. */}
      <p>
        <LockIcon />
        {copy.privacy}{" "}
        <a
          className={styles.link}
          href={RSM_PRIVACY_NOTICE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {copy.privacyLinkLabel}
        </a>
      </p>
    </aside>
  );
}

function LockIcon() {
  return (
    <svg
      className={styles.icon}
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
    >
      <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path d="M12 14v3" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}
