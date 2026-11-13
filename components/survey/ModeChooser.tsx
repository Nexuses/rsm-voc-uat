"use client";

import {
  getVoiceLocale,
  type SurveyVoiceLanguage,
} from "@/lib/survey/voice-locale";
import ModeTypedPreview from "./ModeTypedPreview";
import ModeVoiceWave from "./ModeVoiceWave";
import styles from "./survey.module.css";

type ModeChooserProps = {
  language: SurveyVoiceLanguage;
  onChooseVoice: () => void;
  onChooseTyped: () => void;
};

export default function ModeChooser({
  language,
  onChooseVoice,
  onChooseTyped,
}: ModeChooserProps) {
  const copy = getVoiceLocale(language).modeChooser;

  return (
    <section
      className={`${styles.modeStage} ${styles.modeStageFill}`}
      aria-labelledby="mode-heading"
    >
      <header className={styles.modeStageHeader}>
        <p className={styles.modeStageEyebrow} aria-hidden="true">
          <span>01</span>
        </p>
        <h2 id="mode-heading">{copy.heading}</h2>
        <p className={styles.modeStageLead}>{copy.copy}</p>
      </header>

      <div className={styles.modePaths}>
        <button
          className={`${styles.modePath} ${styles.modePathVoice}`}
          type="button"
          data-mode-path="voice"
          onClick={onChooseVoice}
        >
          <span className={styles.modePathFigure}>{copy.voiceTitle}</span>
          <ModeVoiceWave />
          <span className={styles.modePathBottom}>
            <span className={styles.modeMetricRail} aria-hidden="true">
              <span>CSAT</span>
              <span>CES</span>
              <span>NPS</span>
            </span>
            <strong>{copy.voiceDuration}</strong>
            <small>{copy.voiceHint}</small>
            <span className={styles.modePathGo} aria-hidden="true">
              <ArrowIcon />
            </span>
          </span>
        </button>

        <div
          className={`${styles.modePath} ${styles.modePathTyped}`}
          role="button"
          tabIndex={0}
          onClick={onChooseTyped}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onChooseTyped();
            }
          }}
        >
          <span className={styles.modePathFigure}>{copy.typedTitle}</span>
          <ModeTypedPreview />
          <span className={styles.modePathBottom}>
            <span className={styles.modeMetricRail} aria-hidden="true">
              <span>CSAT</span>
              <span>CES</span>
              <span>NPS</span>
            </span>
            <strong>{copy.typedDuration}</strong>
            <small>{copy.typedHint}</small>
            <span className={styles.modePathGo} aria-hidden="true">
              <ArrowIcon />
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
