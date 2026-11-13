import type { CSSProperties } from "react";
import type { VoiceOrbState } from "./VoiceOrb";
import styles from "./survey.module.css";

type VoiceWaveformProps = {
  state: Extract<VoiceOrbState, "connecting" | "listening" | "speaking">;
  placement?: "orb" | "stage";
};

const stageBarHeights = [22, 38, 58, 32, 66, 45, 28, 54, 70, 42, 62, 34, 52, 26, 46, 20];
const orbBarHeights = [10, 18, 28, 14, 32, 22, 12, 24, 34, 20, 30, 16, 22, 11, 20, 9];

export default function VoiceWaveform({
  state,
  placement = "stage",
}: VoiceWaveformProps) {
  const barHeights = placement === "orb" ? orbBarHeights : stageBarHeights;

  return (
    <div
      className={
        placement === "orb" ? styles.orbWaveform : styles.liveWaveform
      }
      data-state={state}
      role="img"
      aria-label="Live voice waveform"
    >
      {barHeights.map((height, index) => (
        <span
          key={`${height}-${index}`}
          style={{ "--wave-height": `${height}px` } as CSSProperties}
        />
      ))}
    </div>
  );
}
