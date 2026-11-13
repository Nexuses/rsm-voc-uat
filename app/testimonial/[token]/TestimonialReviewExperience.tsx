"use client";

import { useState } from "react";
import { RSM_BRAND_NAME, RSM_LOGO_URL } from "@/lib/brand";
import {
  formatLocaleCopy,
  type SurveyVoiceLanguage,
} from "@/lib/survey/voice-locale";
import { useLocalizedDocument } from "@/lib/survey/use-localized-document";
import { TESTIMONIAL_COPY } from "./testimonial-copy";
import TestimonialReviewForm from "./TestimonialReviewForm";
import styles from "./review.module.css";

export type TestimonialReviewExperienceProps = {
  token: string;
  kind: "draft_approval" | "original_request";
  status: string;
  locked: boolean;
  language: SurveyVoiceLanguage;
  greetingName: string | null;
  initialText: string;
  videoUrl: string;
  consentName: boolean | null;
  consentWebsite: boolean;
  consentSocial: boolean;
};

export default function TestimonialReviewExperience(
  props: TestimonialReviewExperienceProps
) {
  // Default to the language the respondent used on the survey; the switcher
  // stays available so they can read the page in either language.
  const [language, setLanguage] = useState<SurveyVoiceLanguage>(
    props.language
  );
  const rtl = language === "ar";
  const copy = TESTIMONIAL_COPY[language];
  const greeting = props.greetingName
    ? formatLocaleCopy(copy.greetingNamed, { name: props.greetingName })
    : copy.greetingGeneric;

  useLocalizedDocument({ title: copy.documentTitle, lang: language });

  return (
    <main
      className={styles.page}
      dir={rtl ? "rtl" : "ltr"}
      lang={language}
    >
      <header className={styles.topBar}>
        <span className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element -- external RSM asset host, not configured for next/image */}
          <img
            className={styles.brandLogo}
            src={RSM_LOGO_URL}
            alt={RSM_BRAND_NAME}
            width={180}
            height={48}
          />
        </span>
        <nav
          className={styles.languageSwitcher}
          aria-label={copy.languageLabel}
        >
          <button
            type="button"
            className={styles.languageOption}
            aria-pressed={language === "en"}
            onClick={() => setLanguage("en")}
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
            onClick={() => setLanguage("ar")}
          >
            <span className={styles.languageMark} aria-hidden="true">
              ع
            </span>
            {copy.arabic}
          </button>
        </nav>
      </header>

      <div className={styles.body}>
        <div className={styles.column}>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1 className={styles.title}>{copy.title}</h1>
          <p className={styles.intro}>
            <strong>{greeting}</strong> {copy.intro}
          </p>

          <TestimonialReviewForm
            token={props.token}
            kind={props.kind}
            status={props.status}
            locked={props.locked}
            initialText={props.initialText}
            videoUrl={props.videoUrl}
            consentName={props.consentName}
            consentWebsite={props.consentWebsite}
            consentSocial={props.consentSocial}
            copy={copy}
          />
        </div>
      </div>

      <footer className={styles.footer}>
        <span>{copy.footer}</span>
      </footer>
    </main>
  );
}
