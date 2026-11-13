import {
  getVoiceLocale,
  type SurveyVoiceLanguage,
} from "@/lib/survey/voice-locale";
import styles from "./survey.module.css";

type SurveyLanguageSwitcherProps = {
  language: SurveyVoiceLanguage;
  onChange: (language: SurveyVoiceLanguage) => void;
};

export default function SurveyLanguageSwitcher({
  language,
  onChange,
}: SurveyLanguageSwitcherProps) {
  const copy = getVoiceLocale(language).languageSwitcher;

  return (
    <nav className={styles.languageSwitcher} aria-label={copy.label}>
      <button
        type="button"
        className={styles.languageOption}
        aria-pressed={language === "en"}
        onClick={() => onChange("en")}
      >
        <span className={styles.languageMark} aria-hidden="true">
          Aa
        </span>
        {copy.english}
      </button>
      <button
        type="button"
        className={styles.languageOption}
        aria-pressed={language === "ar"}
        onClick={() => onChange("ar")}
      >
        <span className={styles.languageMark} aria-hidden="true">
          ع
        </span>
        {copy.arabic}
      </button>
    </nav>
  );
}
