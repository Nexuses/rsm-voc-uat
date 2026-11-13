"use client";

import Orb from "./Orb";
import styles from "./survey.module.css";

export type VoiceOrbState =
  | "ready"
  | "connecting"
  | "listening"
  | "speaking"
  | "muted"
  | "error"
  | "complete";

type VoiceOrbWaveformState = Extract<
  VoiceOrbState,
  "connecting" | "listening" | "speaking"
>;

type VoiceOrbProps = {
  state: VoiceOrbState;
  /** Kept for call-site compatibility; React Bits Orb replaces the waveform. */
  waveformState?: VoiceOrbWaveformState;
  /**
   * Surface behind the orb. Dark colors keep the swirling ring style;
   * light colors use the soft filled style.
   */
  backgroundColor?: string;
  /** Accessible label; defaults to a generic live-orb description. */
  label?: string;
};

const RSM_ORB_COLORS = ["#3f9c35", "#009cde", "#49c7df"] as const;

function orbPropsForState(state: VoiceOrbState) {
  switch (state) {
    case "speaking":
      return {
        speed: 1.25,
        wobble: 2,
        trail: 1.45,
        hoverIntensity: 1.4,
        forceHoverState: true,
        followCursor: true,
        rotateOnHover: true,
        paused: false,
        opacity: 1,
        glow: 1.45,
        bleed: 1.25,
        highlight: 1.35,
      };
    case "listening":
      return {
        speed: 0.95,
        wobble: 1.55,
        trail: 1.2,
        hoverIntensity: 1.25,
        forceHoverState: true,
        followCursor: true,
        rotateOnHover: true,
        paused: false,
        opacity: 1,
        glow: 1.3,
        bleed: 1.1,
        highlight: 1.2,
      };
    case "connecting":
      return {
        speed: 1.15,
        wobble: 1.65,
        trail: 1.1,
        hoverIntensity: 1.1,
        forceHoverState: true,
        followCursor: false,
        rotateOnHover: true,
        paused: false,
        opacity: 1,
        glow: 1.25,
        bleed: 1.05,
        highlight: 1.15,
      };
    case "muted":
      // Hold: freeze a listening-like soft fill. Do not drop opacity —
      // translucent white soft-fill reads as a gray square overlay.
      return {
        speed: 0.35,
        wobble: 0.9,
        trail: 0.85,
        hoverIntensity: 1.05,
        forceHoverState: true,
        followCursor: false,
        rotateOnHover: false,
        paused: true,
        opacity: 1,
        glow: 1.15,
        bleed: 1,
        highlight: 1.05,
      };
    case "error":
      return {
        speed: 0.55,
        wobble: 0.9,
        trail: 0.5,
        hoverIntensity: 0.5,
        forceHoverState: false,
        followCursor: false,
        rotateOnHover: false,
        paused: false,
        opacity: 0.85,
        glow: 0.85,
        bleed: 0.8,
        highlight: 0.8,
        colors: ["#b94242", "#e4a1a1", "#7a1f1f"] as string[],
      };
    case "complete":
      return {
        speed: 0.5,
        wobble: 0.9,
        trail: 0.7,
        hoverIntensity: 0.8,
        forceHoverState: true,
        followCursor: false,
        rotateOnHover: true,
        paused: false,
        opacity: 1,
        glow: 1.15,
        bleed: 1,
        highlight: 1,
        colors: ["#3f9c35", "#4aad3f", "#49c7df"] as string[],
      };
    default:
      return {
        speed: 0.9,
        wobble: 1.55,
        trail: 1.1,
        hoverIntensity: 1.15,
        forceHoverState: true,
        followCursor: true,
        rotateOnHover: true,
        paused: false,
        opacity: 1,
        glow: 1.2,
        bleed: 1,
        highlight: 1.15,
      };
  }
}

export default function VoiceOrb({
  state,
  backgroundColor = "#ffffff",
  label = "Live voice orb",
}: VoiceOrbProps) {
  const tuned = orbPropsForState(state);
  const colors = tuned.colors ?? [...RSM_ORB_COLORS];

  return (
    <div
      className={styles.orbWrap}
      data-state={state}
      role="img"
      aria-label={label}
    >
      <Orb
        colors={colors}
        hoverIntensity={tuned.hoverIntensity}
        trail={tuned.trail}
        rotateOnHover={tuned.rotateOnHover}
        followCursor={tuned.followCursor}
        forceHoverState={tuned.forceHoverState}
        wobble={tuned.wobble}
        speed={tuned.speed}
        glow={tuned.glow}
        bleed={tuned.bleed}
        highlight={tuned.highlight}
        size={1.05}
        backgroundColor={backgroundColor}
        opacity={tuned.opacity}
        paused={tuned.paused}
        clickPulse={state !== "muted" && state !== "error"}
        intro={false}
      />
      {state === "complete" ? (
        <span className={styles.orbCheck} aria-hidden="true" />
      ) : null}
    </div>
  );
}
