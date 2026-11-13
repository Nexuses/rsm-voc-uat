"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./survey.module.css";

const COLORS = ["#63666A", "#63666A", "#009CDE", "#3F9C35", "#3F9C35"];
// Faces render reversed (smile at inline-start), so value 4 is the smile.
// Start the demo on the smile and walk down toward the frown, then back up.
const AUTO_SEQ = [4, 3, 2, 1, 0, 1, 2, 3];
const INITIAL_RATING = 4;

function mouthPath(index: number): string {
  const n = (index / 4) * 10;
  const edge = 15.5 - n * 0.15;
  const ctrl = 11.5 + n * 0.8;
  return `M8 ${edge.toFixed(2)} Q12 ${ctrl.toFixed(2)} 16 ${edge.toFixed(2)}`;
}

/**
 * Typed-tile preview from respond-section.html — face scale + auto demo.
 */
export default function ModeTypedPreview() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(INITIAL_RATING);
  const [paused, setPaused] = useState(false);
  const dragging = useRef(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion || paused) return;
    let k = 0;
    const id = window.setInterval(() => {
      setCurrent(AUTO_SEQ[k++ % AUTO_SEQ.length]);
    }, 1100);
    return () => window.clearInterval(id);
  }, [paused]);

  function pickFromClientX(clientX: number) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const node =
      Number.parseFloat(
        getComputedStyle(track).getPropertyValue("--mode-typed-node")
      ) || 46;
    const usable = Math.max(1, rect.width - node);
    const fromLeft = Math.round(((clientX - rect.left - node / 2) / usable) * 4);
    // The track is pinned to LTR (see `.modeTypedTrack`), so the smile always
    // sits on the visual left and physical x maps straight to the inline
    // position. Nodes are still drawn in reversed order, hence the inversion.
    setCurrent(Math.max(0, Math.min(4, 4 - fromLeft)));
  }

  return (
    <div
      className={styles.modeTypedRate}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        ref={trackRef}
        className={styles.modeTypedTrack}
        role="radiogroup"
        aria-label="Preview of the rating scale"
        style={{ ["--mode-typed-c" as string]: COLORS[current] }}
        onPointerDown={(event) => {
          setPaused(true);
          dragging.current = true;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* ignore */
          }
          pickFromClientX(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          pickFromClientX(event.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        onKeyDown={(event) => {
          // Faces are pinned to smile-left (the track is always LTR), so a
          // physical rightward step lowers the rating in both languages.
          const delta =
            event.key === "ArrowRight" || event.key === "ArrowDown"
              ? -1
              : event.key === "ArrowLeft" || event.key === "ArrowUp"
                ? 1
                : event.key === "Home"
                  ? -9
                  : event.key === "End"
                    ? 9
                    : 0;
          if (!delta) return;
          event.preventDefault();
          setPaused(true);
          setCurrent((value) => Math.max(0, Math.min(4, value + delta)));
        }}
      >
        <span className={styles.modeTypedRail} aria-hidden="true" />
        <span
          className={styles.modeTypedFill}
          aria-hidden="true"
          style={{
            // Fill represents how positive the rating is (not the node's
            // reversed x-position): it is anchored to the frown edge and
            // grows toward the active node, so it shrinks — unfills from
            // smile (left) to frown (right) — as the rating worsens.
            width: `calc(${current} / 4 * (100% - var(--mode-typed-node)))`,
          }}
        />
        {COLORS.map((color, value) => {
          // Reversed visual order: the smiling (high-value) face sits on
          // the left and the frowning (low-value) face sits on the right.
          // Uses the logical inset so it mirrors automatically under RTL.
          const pos = 4 - value;
          return (
            <button
              key={color + value}
              type="button"
              className={styles.modeTypedNode}
              role="radio"
              aria-label={`Rating ${value + 1} of 5`}
              aria-checked={current === value}
              tabIndex={current === value ? 0 : -1}
              data-on={current === value ? "true" : "false"}
              data-done={value <= current ? "true" : "false"}
              style={{
                insetInlineStart: `calc(${pos} / 4 * (100% - var(--mode-typed-node)))`,
                ["--mode-typed-n" as string]: color,
              }}
              onClick={() => {
                setPaused(true);
                setCurrent(value);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle className={styles.modeTypedNodeBg} cx="12" cy="12" r="10.5" />
                <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
                <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
                <path d={mouthPath(value)} />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
