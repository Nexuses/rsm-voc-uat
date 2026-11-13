import { type VoiceHostSelection } from "@/lib/survey/arabic-voice-options";
import {
  getVoiceLocale,
  isRtlVoiceLanguage,
  type SurveyVoiceLanguage,
} from "@/lib/survey/voice-locale";
import styles from "./survey.module.css";

type ArabicVoiceChooserProps = {
  language: SurveyVoiceLanguage;
  onBack: () => void;
  onChooseVoice: (voice: VoiceHostSelection) => void;
};

const BAR_COUNT = 28;

/** Deterministic bar heights matching the reference's sine pattern. */
const BAR_HEIGHTS = Array.from(
  { length: BAR_COUNT },
  (_, i) => 6 + Math.round(Math.abs(Math.sin(i * 0.9)) * 22)
);

export default function ArabicVoiceChooser({
  language,
  onBack,
  onChooseVoice,
}: ArabicVoiceChooserProps) {
  const copy = getVoiceLocale(language).voicePicker;
  const rtl = isRtlVoiceLanguage(language);

  return (
    <section
      className={`${styles.modeStage} ${styles.modeStageFill} ${styles.voicePickerStage} ${rtl ? styles.rtl : ""}`}
      dir={rtl ? "rtl" : undefined}
      aria-labelledby="voice-picker-heading"
    >
      <header className={styles.modeStageHeader}>
        <p className={styles.modeStageEyebrow} aria-hidden="true">
          <span>02</span>
        </p>
        <h2 id="voice-picker-heading">{copy.heading}</h2>
        <p className={styles.modeStageLead}>{copy.copy}</p>
      </header>

      <div className={styles.modePaths}>
        <VoiceSampleTile
          variant="typed"
          lang="en"
          dir="ltr"
          title={copy.englishTitle}
          description={copy.englishHint}
          avatarInitial="S"
          quote="Hello, I’m Sara."
          goLabel={copy.chooseEnglish}
          onChoose={() => onChooseVoice("english")}
        />

        <VoiceSampleTile
          variant="voiceRtl"
          lang="ar"
          dir="rtl"
          title={copy.arabicTitle}
          description={copy.arabicHint}
          avatarInitial="س"
          quote="مرحبًا، أنا سارة."
          goLabel={copy.chooseArabic}
          onChoose={() => onChooseVoice("arabic")}
        />
      </div>

      <button className={styles.modeStageBack} type="button" onClick={onBack}>
        {copy.back}
      </button>
    </section>
  );
}

type VoiceSampleTileProps = {
  variant: "typed" | "voiceRtl";
  title: string;
  description: string;
  avatarInitial: string;
  quote: string;
  goLabel: string;
  lang?: string;
  dir?: "rtl" | "ltr";
  onChoose: () => void;
};

function VoiceSampleTile({
  variant,
  title,
  description,
  avatarInitial,
  quote,
  goLabel,
  lang,
  dir,
  onChoose,
}: VoiceSampleTileProps) {
  return (
    <div
      className={`${styles.modePath} ${
        variant === "typed" ? styles.modePathTyped : styles.modePathVoice
      } ${variant === "voiceRtl" ? styles.modePathRtl : ""}`}
      role="button"
      tabIndex={0}
      lang={lang}
      dir={dir}
      onClick={onChoose}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onChoose();
        }
      }}
    >
      <span className={styles.modePathWordmark}>{title}</span>

      <span className={styles.voicePickerBody}>
        <span className={styles.voicePickerCard}>
          <span className={styles.voicePickerVoiceNote}>
            <span className={styles.voicePickerAvatar} aria-hidden="true">
              {avatarInitial}
            </span>
            <span className={styles.voicePickerBars} aria-hidden="true">
              {BAR_HEIGHTS.map((height, index) => (
                <i
                  key={index}
                  data-on="true"
                  style={{
                    height: `${height}px`,
                    animationDelay: `${(index % 7) * 90}ms`,
                  }}
                />
              ))}
            </span>
            <span className={styles.voicePickerDur}>0:08</span>
          </span>
          <span className={styles.voicePickerQuote} lang={lang} dir={dir}>
            {quote}
          </span>
        </span>
      </span>

      <span className={styles.modePathBody}>
        <small lang={lang} dir={dir}>
          {description}
        </small>
      </span>

      <span className={styles.modePathGo} aria-hidden="true">
        <ArrowIcon />
      </span>
      <span className={styles.visuallyHidden}>{goLabel}</span>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
      <path
        d="M5 12h12M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
