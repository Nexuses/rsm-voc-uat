"use client";

import { useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { Keyboard, Pause, PhoneOff, Play } from "lucide-react";
import {
  getVoiceConversationLanguage,
  getVoiceLocale,
  isRtlVoiceLanguage,
  type SurveyVoiceLanguage,
} from "@/lib/survey/voice-locale";
import { getHostVoiceIdForLanguage } from "@/lib/survey/arabic-voice-options";
import type { SurveyCompleteResult } from "@/lib/survey/complete-result";
import {
  toVoiceDynamicVariables,
  type VoiceInviteContext,
} from "@/lib/survey/invite-context";
import { buildVoiceInviteOpening } from "@/lib/survey/voice-first-message";
import {
  captionAdvanceMs,
  formatVoiceTranscriptMessage,
  splitCaptionLines,
  stripVoiceAudioTags,
} from "@/lib/survey/voice-transcript";
import VoiceOrb, { type VoiceOrbState } from "./VoiceOrb";
import styles from "./survey.module.css";

async function linkInviteConversation(
  inviteToken: string | null | undefined,
  conversationId: string | undefined
) {
  if (!inviteToken || !conversationId) return;

  try {
    await fetch("/api/survey/invite-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: inviteToken, conversationId }),
    });
  } catch {
    // Invite linking must not block the survey experience.
  }
}

async function fetchInviteContext(
  inviteToken: string | null
): Promise<VoiceInviteContext> {
  const empty: VoiceInviteContext = {
    fullName: "",
    company: "",
    designation: "",
  };
  if (!inviteToken) return empty;

  try {
    const response = await fetch("/api/survey/invite-context", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inviteToken }),
    });
    if (!response.ok) return empty;
    const body = (await response.json()) as {
      inviteContext?: Partial<VoiceInviteContext> | null;
    };
    return {
      fullName: body.inviteContext?.fullName?.trim() || "",
      company: body.inviteContext?.company?.trim() || "",
      designation: body.inviteContext?.designation?.trim() || "",
    };
  } catch {
    return empty;
  }
}

function mergeInviteContext(
  primary: VoiceInviteContext,
  fallback: VoiceInviteContext
): VoiceInviteContext {
  return {
    fullName: primary.fullName || fallback.fullName,
    company: primary.company || fallback.company,
    designation: primary.designation || fallback.designation,
  };
}

function formatCallTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type VoiceErrorKey =
  | "micDenied"
  | "sessionFailed"
  | "creditsExhausted"
  | "connectionInterrupted"
  | null;

type VoiceSurveyProps = {
  language: SurveyVoiceLanguage;
  inviteToken?: string | null;
  onBack: () => void;
  onUseTyped: () => void;
  onComplete: (result?: SurveyCompleteResult) => void;
};

export default function VoiceSurvey({
  language,
  inviteToken = null,
  onBack,
  onUseTyped,
  onComplete,
}: VoiceSurveyProps) {
  const conversationLanguage = getVoiceConversationLanguage(language);
  const hostVoiceId = getHostVoiceIdForLanguage(conversationLanguage);
  const copy = getVoiceLocale(language).voice;
  const rtl = isRtlVoiceLanguage(language);
  const sessionActive = useRef(false);
  const sessionEnded = useRef(false);
  const wasConnected = useRef(false);
  const connectedAtMs = useRef<number | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const readyStageRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const [isStarting, setIsStarting] = useState(false);
  // Store an error *key*, not the resolved copy string, so the alert
  // re-renders in the active language if the user toggles language while
  // the error is showing.
  const [localErrorKey, setLocalErrorKey] = useState<VoiceErrorKey>(null);
  const localError = localErrorKey ? copy[localErrorKey] : "";
  const [captionLines, setCaptionLines] = useState<string[]>([]);
  const [captionIndex, setCaptionIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [onHold, setOnHold] = useState(false);
  const holdActivityTimer = useRef<number | null>(null);
  const conversation = useConversation({
    onConnect: () => {
      setLocalErrorKey(null);
      sessionActive.current = true;
      sessionEnded.current = false;
      wasConnected.current = true;
      connectedAtMs.current = Date.now();
      const conversationId = conversation.getId() || null;
      conversationIdRef.current = conversationId;
      void linkInviteConversation(inviteToken, conversationId || undefined);
    },
    onMessage: ({ role, message }) => {
      if (role === "agent") {
        const cleaned = stripVoiceAudioTags(message);
        const lines = splitCaptionLines(cleaned);
        setCaptionLines(lines);
        setCaptionIndex(0);
      }
    },
    onDisconnect: () => {
      sessionEnded.current = true;
      if (!sessionActive.current) return;

      sessionActive.current = false;
      const startedAt = connectedAtMs.current;
      connectedAtMs.current = null;
      const livedMs = startedAt == null ? 0 : Date.now() - startedAt;

      // A connect→disconnect bounce (override rejection, provider remount, etc.)
      // must not jump to the thank-you screen.
      if (livedMs < MIN_SESSION_MS_BEFORE_COMPLETE) {
        setLocalErrorKey("connectionInterrupted");
        return;
      }

      onCompleteRef.current({
        conversationId:
          conversationIdRef.current || conversation.getId() || null,
      });
    },
    onError: (error) => {
      if (wasConnected.current) {
        setLocalErrorKey(
          isQuotaExceededError(error)
            ? "creditsExhausted"
            : "connectionInterrupted"
        );
      } else if (isQuotaExceededError(error)) {
        setLocalErrorKey("creditsExhausted");
      }
    },
  });

  async function startVoiceSurvey() {
    setIsStarting(true);
    setLocalErrorKey(null);
    wasConnected.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());

      // Same invite-context source as typed survey, plus voice-session payload.
      const [contextFromInviteApi, sessionResponse] = await Promise.all([
        fetchInviteContext(inviteToken),
        fetch("/api/survey/voice-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            language: conversationLanguage,
            ...(inviteToken ? { inviteToken } : {}),
          }),
        }),
      ]);
      if (!sessionResponse.ok) throw new Error("session request failed");

      const body = (await sessionResponse.json()) as {
        signedUrl?: string;
        inviteContext?: Partial<VoiceInviteContext> | null;
      };
      if (!body.signedUrl) throw new Error("missing signed URL");

      const inviteContext = mergeInviteContext(contextFromInviteApi, {
        fullName: body.inviteContext?.fullName?.trim() || "",
        company: body.inviteContext?.company?.trim() || "",
        designation: body.inviteContext?.designation?.trim() || "",
      });

      // Do not override firstMessage — that override rejects/bounces some
      // signed-url sessions. Personalize via {{invite_opening}} instead.
      const inviteOpening = buildVoiceInviteOpening(
        conversationLanguage,
        inviteContext
      );

      await conversation.startSession({
        signedUrl: body.signedUrl,
        dynamicVariables: {
          ...toVoiceDynamicVariables(inviteContext),
          invite_opening: inviteOpening,
        },
        overrides: {
          agent: {
            language: conversationLanguage,
          },
          ...(hostVoiceId ? { tts: { voiceId: hostVoiceId } } : {}),
        },
      });
      const linkedId = conversation.getId() || null;
      if (linkedId) conversationIdRef.current = linkedId;
      void linkInviteConversation(inviteToken, linkedId || undefined);
    } catch (error) {
      if (conversation.status !== "connected") {
        sessionActive.current = false;
        setLocalErrorKey(
          isPermissionError(error)
            ? "micDenied"
            : isQuotaExceededError(error)
              ? "creditsExhausted"
              : "sessionFailed"
        );
      }
    } finally {
      setIsStarting(false);
    }
  }

  function clearHoldKeepAlive() {
    if (holdActivityTimer.current != null) {
      window.clearInterval(holdActivityTimer.current);
      holdActivityTimer.current = null;
    }
  }

  function putCallOnHold() {
    // ElevenLabs has no official pause yet: mute mic, silence output, and
    // send periodic user-activity so the agent stays quiet while held.
    conversation.setMuted(true);
    try {
      conversation.setVolume({ volume: 0 });
    } catch {
      // Volume control may be unavailable mid-transition.
    }
    clearHoldKeepAlive();
    holdActivityTimer.current = window.setInterval(() => {
      try {
        conversation.sendUserActivity();
      } catch {
        // Ignore keep-alive failures while held.
      }
    }, 1000);
    setOnHold(true);
  }

  function resumeCallFromHold() {
    clearHoldKeepAlive();
    try {
      conversation.setVolume({ volume: 1 });
    } catch {
      // Volume control may be unavailable mid-transition.
    }
    conversation.setMuted(false);
    setOnHold(false);
  }

  function toggleHold() {
    if (onHold) {
      resumeCallFromHold();
      return;
    }
    putCallOnHold();
  }

  function endVoiceSurvey() {
    clearHoldKeepAlive();
    setOnHold(false);
    sessionActive.current = false;
    sessionEnded.current = true;
    connectedAtMs.current = null;
    const conversationId =
      conversationIdRef.current || conversation.getId() || null;
    conversation.endSession();
    onComplete({ conversationId });
  }

  function switchToTypedSurvey() {
    clearHoldKeepAlive();
    setOnHold(false);
    if (connected) {
      sessionActive.current = false;
      sessionEnded.current = true;
      connectedAtMs.current = null;
      conversation.endSession();
    }
    onUseTyped();
  }

  const connected = conversation.status === "connected";
  const endSessionRef = useRef(conversation.endSession);
  endSessionRef.current = conversation.endSession;
  const connectedRef = useRef(connected);
  connectedRef.current = connected;

  useEffect(() => {
    function handlePageHide() {
      if (connectedRef.current) {
        endSessionRef.current();
      }
    }

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      clearHoldKeepAlive();
      if (connectedRef.current && !sessionEnded.current) {
        // Prevent onDisconnect from treating unmount as survey completion.
        sessionActive.current = false;
        sessionEnded.current = true;
        connectedAtMs.current = null;
        endSessionRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (!connected) {
      clearHoldKeepAlive();
      setOnHold(false);
      setElapsedSec(0);
      return;
    }
    if (onHold) return;
    const timer = window.setInterval(() => {
      setElapsedSec((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [connected, onHold]);

  useEffect(() => {
    if (onHold) return;
    if (captionLines.length <= 1) return;
    if (captionIndex >= captionLines.length - 1) return;
    const line = captionLines[captionIndex] || "";
    const advanceMs = captionAdvanceMs(line, {
      isSpeaking: conversation.isSpeaking,
    });
    const timer = window.setTimeout(() => {
      setCaptionIndex((current) =>
        Math.min(current + 1, captionLines.length - 1)
      );
    }, advanceMs);
    return () => window.clearTimeout(timer);
  }, [captionLines, captionIndex, conversation.isSpeaking, onHold]);

  useEffect(() => {
    // The ready screen (heading + instruction + orb + controls) is taller than
    // the viewport on most laptops and phones, which leaves Back / Start voice
    // survey below the fold. Bring the controls into view as soon as the step
    // opens so the client can start without hunting for the button.
    if (!readyStageRef.current) return;

    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    function revealControls() {
      const element = readyStageRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const bottomGap = 20;
      if (rect.top >= 0 && rect.bottom <= window.innerHeight - bottomGap) {
        return;
      }
      window.scrollTo({
        top: Math.max(
          0,
          window.scrollY + rect.bottom - window.innerHeight + bottomGap
        ),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }

    const frame = window.requestAnimationFrame(revealControls);
    // The entry animation, web font swap, and orb mount can still change the
    // panel height after the first frame, so re-check once they settle.
    const settleTimer = window.setTimeout(revealControls, 600);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, []);

  const isConnecting =
    isStarting || conversation.status === "connecting";
  const showError = Boolean(localError && !connected && !isConnecting);
  const visualState: VoiceOrbState = showError
    ? "error"
    : isConnecting
      ? "connecting"
      : connected && onHold
        ? "muted"
        : connected && conversation.isSpeaking
          ? "speaking"
          : connected
            ? "listening"
            : "ready";
  const statusText = showError
    ? copy.statusError
    : onHold
      ? copy.statusOnHold
      : visualState === "connecting"
        ? copy.statusConnecting
        : visualState === "speaking"
          ? copy.statusSpeaking
          : visualState === "listening"
            ? copy.statusListening
            : copy.statusReady;

  const activeCaption =
    captionLines[captionIndex] ||
    (connected ? copy.agentActive : copy.agentIdle);
  const displayCaption =
    formatVoiceTranscriptMessage(activeCaption) || activeCaption;

  return (
    <section
      className={`${styles.voicePanel} ${rtl ? styles.rtl : ""}`}
      data-call="true"
      dir={rtl ? "rtl" : undefined}
      aria-labelledby="voice-heading"
    >
      {connected ? (
        <div
          className={styles.voiceCallStage}
          data-state={visualState}
          data-hold={onHold ? "true" : undefined}
        >
          <header className={styles.voiceCallHeader}>
            <div className={styles.voiceCallChrome}>
              <p
                className={styles.voiceCallStatus}
                data-state={visualState}
                aria-live="polite"
              >
                <span className={styles.voiceLiveDot} aria-hidden="true" />
                {statusText}
              </p>
              <p
                className={styles.voiceCallTimer}
                aria-label={copy.callTimerLabel}
              >
                {formatCallTimer(elapsedSec)}
              </p>
            </div>
            <div className={styles.sectionHeading}>
              <span aria-hidden="true">03</span>
              <h2 id="voice-heading">{copy.heading}</h2>
            </div>
          </header>

          <div
            className={styles.voiceCaptionPanel}
            data-hold={onHold ? "true" : undefined}
          >
            <p
              key={onHold ? "held" : displayCaption}
              className={styles.voiceCaption}
              aria-live="polite"
            >
              {displayCaption}
            </p>
          </div>

          <div className={styles.voiceCallOrb} data-state={visualState}>
            <span className={styles.voiceOrbHalo} aria-hidden="true" />
            <span className={styles.voiceOrbHalo} aria-hidden="true" />
            <VoiceOrb
              state={visualState}
              backgroundColor="#ffffff"
              label={copy.orbLabel}
            />
          </div>

          <div className={styles.voiceCallControls}>
            <button
              className={styles.callControl}
              type="button"
              aria-label={onHold ? copy.resume : copy.hold}
              title={onHold ? copy.resume : copy.hold}
              data-active={onHold ? "true" : undefined}
              onClick={toggleHold}
            >
              <span className={styles.callControlIcon} aria-hidden="true">
                {onHold ? (
                  <Play strokeWidth={2} absoluteStrokeWidth />
                ) : (
                  <Pause strokeWidth={2} absoluteStrokeWidth />
                )}
              </span>
              <span className={styles.callControlLabel}>
                {onHold ? copy.resume : copy.hold}
              </span>
            </button>
            <button
              className={`${styles.callControl} ${styles.callControlEnd}`}
              type="button"
              aria-label={copy.endSurvey}
              title={copy.endSurvey}
              onClick={endVoiceSurvey}
            >
              <span className={styles.callControlIcon} aria-hidden="true">
                <PhoneOff strokeWidth={2} absoluteStrokeWidth />
              </span>
              <span className={styles.callControlLabel}>{copy.endSurvey}</span>
            </button>
            <button
              className={styles.callControl}
              type="button"
              aria-label={copy.switchTyped}
              title={copy.switchTyped}
              onClick={switchToTypedSurvey}
            >
              <span className={styles.callControlIcon} aria-hidden="true">
                <Keyboard strokeWidth={2} absoluteStrokeWidth />
              </span>
              <span className={styles.callControlLabel}>{copy.switchTyped}</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={readyStageRef}
          className={styles.voiceReadyStage}
          data-state={visualState}
        >
          <header className={styles.voiceCallHeader}>
            <div className={styles.voiceCallChrome}>
              <p
                className={styles.voiceCallStatus}
                data-state={visualState}
                aria-live="polite"
              >
                <span className={styles.voiceLiveDot} aria-hidden="true" />
                {statusText}
              </p>
            </div>
            <div className={styles.sectionHeading}>
              <span aria-hidden="true">03</span>
              <h2 id="voice-heading">{copy.heading}</h2>
            </div>
          </header>

          <div className={styles.voiceCaptionPanel}>
            <p key={displayCaption} className={styles.voiceCaption}>
              {displayCaption}
            </p>
          </div>

          <div className={styles.voiceCallOrb} data-state={visualState}>
            <span className={styles.voiceOrbHalo} aria-hidden="true" />
            <span className={styles.voiceOrbHalo} aria-hidden="true" />
            <VoiceOrb
              state={visualState}
              backgroundColor="#ffffff"
              label={copy.orbLabel}
            />
          </div>

          {showError ? (
            <p className={styles.voiceError} role="alert">
              {localError}
            </p>
          ) : null}

          <div className={styles.voiceActions}>
            <button
              className={styles.textButton}
              type="button"
              onClick={onBack}
              disabled={isStarting}
            >
              {copy.back}
            </button>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={startVoiceSurvey}
              disabled={isStarting}
            >
              {showError
                ? copy.tryAgain
                : isStarting
                  ? copy.starting
                  : copy.start}
            </button>
          </div>

          <button
            className={styles.typedFallback}
            type="button"
            onClick={switchToTypedSurvey}
            disabled={isStarting}
          >
            {copy.useTyped}
          </button>
        </div>
      )}
    </section>
  );
}

/** Ignore connect→disconnect bounces shorter than this (ms). */
const MIN_SESSION_MS_BEFORE_COMPLETE = 2500;

function isPermissionError(error: unknown) {
  return (
    error instanceof DOMException &&
    ["NotAllowedError", "PermissionDeniedError"].includes(error.name)
  );
}

function isQuotaExceededError(error: unknown) {
  const text =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : String(error ?? "");
  return /quota_exceeded|run out of credits|out of credits/i.test(text);
}

