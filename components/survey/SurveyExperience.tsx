"use client";

import { useEffect, useRef, useState } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import {
  isArabicVoiceSelection,
  type VoiceHostSelection,
} from "@/lib/survey/arabic-voice-options";
import type { SurveyCompleteResult } from "@/lib/survey/complete-result";
import {
  getVoiceLocale,
  isRtlVoiceLanguage,
  type SurveyVoiceLanguage,
} from "@/lib/survey/voice-locale";
import { useSurveyInviteTracking } from "./useSurveyInviteTracking";
import { useLocalizedDocument } from "@/lib/survey/use-localized-document";
import ArabicVoiceChooser from "./ArabicVoiceChooser";
import ModeChooser from "./ModeChooser";
import SurveyShell from "./SurveyShell";
import TypedSurvey from "./TypedSurvey";
import VoiceOrb from "./VoiceOrb";
import VoiceSurvey from "./VoiceSurvey";
import styles from "./survey.module.css";

type SurveyMode = "choose" | "voice" | "typed" | "complete";

type SurveyExperienceProps = {
  initialMode?: SurveyMode;
  initialLanguage?: SurveyVoiceLanguage;
  initialVoiceHost?: VoiceHostSelection;
  /** @deprecated Use initialLanguage */
  initialVoiceLanguage?: SurveyVoiceLanguage;
  inviteToken?: string | null;
};

type TestimonialOffer = NonNullable<SurveyCompleteResult["testimonial"]>;

const OFFER_POLL_MS = 2000;
const OFFER_POLL_MAX_ATTEMPTS = 15;

export default function SurveyExperience({
  initialMode = "choose",
  initialLanguage,
  initialVoiceHost,
  initialVoiceLanguage = "en",
  inviteToken = null,
}: SurveyExperienceProps) {
  const { trackSurveyStart } = useSurveyInviteTracking(inviteToken);
  const [mode, setMode] = useState<SurveyMode>(initialMode);
  const [language, setLanguage] = useState<SurveyVoiceLanguage>(
    initialLanguage ?? initialVoiceLanguage
  );
  const [voiceHostSelection, setVoiceHostSelection] =
    useState<VoiceHostSelection | null>(
      initialMode === "voice" ? (initialVoiceHost ?? "english") : null
    );
  const [completeLanguage, setCompleteLanguage] =
    useState<SurveyVoiceLanguage>("en");
  const [testimonialOffer, setTestimonialOffer] =
    useState<TestimonialOffer | null>(null);
  const [offerConversationId, setOfferConversationId] = useState<string | null>(
    null
  );
  const pollCancelled = useRef(false);

  function handleLanguageChange(nextLanguage: SurveyVoiceLanguage) {
    setLanguage(nextLanguage);
  }

  function handleChooseVoice() {
    trackSurveyStart();
    setVoiceHostSelection(null);
    setMode("voice");
  }

  function handleVoiceHostSelection(selection: VoiceHostSelection) {
    setVoiceHostSelection(selection);
    setLanguage(isArabicVoiceSelection(selection) ? "ar" : "en");
  }

  function handleVoiceBack() {
    if (voiceHostSelection) {
      setVoiceHostSelection(null);
      return;
    }
    setMode("choose");
    setVoiceHostSelection(null);
  }

  const showVoicePicker = mode === "voice" && voiceHostSelection === null;
  const showVoiceSurvey = mode === "voice" && voiceHostSelection !== null;

  const shellLanguage =
    mode === "complete" ? completeLanguage : language;
  const shellRtl = isRtlVoiceLanguage(shellLanguage);

  function finishSurvey(result?: SurveyCompleteResult) {
    setCompleteLanguage(language);
    setTestimonialOffer(result?.testimonial ?? null);
    setOfferConversationId(
      result?.testimonial ? null : result?.conversationId?.trim() || null
    );
    setMode("complete");
  }

  useEffect(() => {
    if (mode !== "complete" || !offerConversationId || testimonialOffer) {
      return;
    }

    pollCancelled.current = false;
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (pollCancelled.current) return;
      attempts += 1;
      try {
        const response = await fetch("/api/survey/testimonial-offer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId: offerConversationId }),
        });
        if (response.ok) {
          const body = (await response.json()) as {
            status?: string;
            kind?: TestimonialOffer["kind"];
            url?: string;
          };
          if (
            body.status === "ready" &&
            body.url &&
            (body.kind === "draft_approval" || body.kind === "original_request")
          ) {
            if (!pollCancelled.current) {
              setTestimonialOffer({ kind: body.kind, url: body.url });
              setOfferConversationId(null);
            }
            return;
          }
          if (body.status === "ineligible") {
            if (!pollCancelled.current) setOfferConversationId(null);
            return;
          }
        }
      } catch {
        // Keep polling until the attempt budget is spent.
      }

      if (attempts >= OFFER_POLL_MAX_ATTEMPTS) {
        if (!pollCancelled.current) setOfferConversationId(null);
        return;
      }
      timeoutId = setTimeout(() => {
        void poll();
      }, OFFER_POLL_MS);
    }

    void poll();

    return () => {
      pollCancelled.current = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [mode, offerConversationId, testimonialOffer]);

  const completeCopy = getVoiceLocale(completeLanguage).complete;
  useLocalizedDocument({
    title: getVoiceLocale(shellLanguage).shell.documentTitle,
    lang: shellLanguage,
  });
  const testimonialLabel =
    testimonialOffer?.kind === "draft_approval"
      ? completeCopy.reviewTestimonial
      : completeCopy.shareTestimonial;
  return (
    <SurveyShell
      language={shellLanguage}
      onLanguageChange={handleLanguageChange}
      showIntro={mode === "choose"}
    >
      {mode === "choose" ? (
        <ModeChooser
          language={language}
          onChooseVoice={handleChooseVoice}
          onChooseTyped={() => {
            trackSurveyStart();
            setMode("typed");
          }}
        />
      ) : null}

      {mode === "voice" ? (
        <ConversationProvider>
          {showVoicePicker ? (
            <ArabicVoiceChooser
              language={language}
              onBack={() => {
                setMode("choose");
                setVoiceHostSelection(null);
              }}
              onChooseVoice={handleVoiceHostSelection}
            />
          ) : null}

          {showVoiceSurvey ? (
            <VoiceSurvey
              language={language}
              inviteToken={inviteToken}
              onBack={handleVoiceBack}
              onUseTyped={() => setMode("typed")}
              onComplete={finishSurvey}
            />
          ) : null}
        </ConversationProvider>
      ) : null}

      {mode === "typed" ? (
        <TypedSurvey
          language={language}
          inviteToken={inviteToken}
          onBack={() => setMode("choose")}
          onComplete={finishSurvey}
        />
      ) : null}

      {mode === "complete" ? (
        <section
          className={`${styles.completePanel} ${styles.completeStage} ${shellRtl ? styles.rtl : ""}`}
          dir={shellRtl ? "rtl" : undefined}
          aria-labelledby="complete-heading"
        >
          <div className={styles.sectionHeading}>
            <h2 id="complete-heading">{completeCopy.heading}</h2>
          </div>
          <VoiceOrb state="complete" label={completeCopy.iconAlt} />
          <h3>{completeCopy.title}</h3>
          <p>{completeCopy.body}</p>
          <div className={styles.completeActions}>
            {testimonialOffer ? (
              <a className={styles.primaryButton} href={testimonialOffer.url}>
                {testimonialLabel}
              </a>
            ) : null}
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => {
                setTestimonialOffer(null);
                setOfferConversationId(null);
                setMode("choose");
              }}
            >
              {completeCopy.submitAnother}
            </button>
          </div>
        </section>
      ) : null}
    </SurveyShell>
  );
}
