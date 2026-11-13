import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import PrivacyNotice from "@/components/PrivacyNotice";
import {
  getVoiceLocale,
  isRtlVoiceLanguage,
  type SurveyVoiceLanguage,
} from "@/lib/survey/voice-locale";
import SurveyLanguageSwitcher from "./SurveyLanguageSwitcher";
import styles from "./survey.module.css";

type SurveyShellProps = {
  children: ReactNode;
  language?: SurveyVoiceLanguage;
  onLanguageChange?: (language: SurveyVoiceLanguage) => void;
  /** Show the small grey intro line. Landing page only — it must not repeat
   * across voice/typed/review/thank-you steps. Defaults to true so other
   * call sites keep prior behaviour. */
  showIntro?: boolean;
};

/**
 * Glues the Arabic preposition "بـ" to the brand name it introduces. The
 * source copy reads "بـ RSM" with a space, which renders as a visible gap
 * between the preposition and the brand; joining the characters (and
 * keeping the pair non-breaking) makes it read as one word.
 */
function withNonBreakingArabicBrandJoin(text: string) {
  const marker = "بـ RSM";
  const index = text.indexOf(marker);
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <span className={styles.nowrapJoin}>بـRSM</span>
      {text.slice(index + marker.length)}
    </>
  );
}

export default function SurveyShell({
  children,
  language = "en",
  onLanguageChange,
  showIntro = true,
}: SurveyShellProps) {
  const copy = getVoiceLocale(language).shell;
  const rtl = isRtlVoiceLanguage(language);

  return (
    <main className={styles.page}>
      <section className={styles.frame}>
        <header className={styles.header}>
          {/* Wide 3.2:1 art for tablet and desktop. */}
          <Image
            src="/Frame-1171276008.png"
            alt={copy.bannerAlt}
            width={1920}
            height={600}
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            className={`${styles.headerBanner} ${styles.headerBannerWide}`}
          />
          {/* Compact 16:10 art for phones: the wide banner shrinks to a ~120px
              strip and its headline is unreadable at that width. Lazy loading
              keeps this off the wire on desktop, where it is display:none. */}
          <Image
            src="/Frame-117127598111.png"
            alt={copy.bannerAlt}
            width={2560}
            height={1600}
            sizes="100vw"
            className={`${styles.headerBanner} ${styles.headerBannerCompact}`}
          />
        </header>

        <div className={styles.content}>
          {showIntro ? (
            <div className={styles.intro}>
              <p>
                {rtl
                  ? withNonBreakingArabicBrandJoin(copy.introBody)
                  : copy.introBody}
              </p>
            </div>
          ) : null}
          <div
            className={`${styles.surveyBody} ${rtl ? styles.rtl : ""}`}
            dir={rtl ? "rtl" : undefined}
          >
            {children}
          </div>
        </div>

        <PrivacyNotice language={language} />

        <footer className={styles.footer}>
          <Link href="/login">{copy.cxLogin}</Link>
        </footer>
      </section>

      {onLanguageChange ? (
        <SurveyLanguageSwitcher
          language={language}
          onChange={onLanguageChange}
        />
      ) : null}
    </main>
  );
}
