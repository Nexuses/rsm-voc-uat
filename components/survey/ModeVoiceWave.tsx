"use client";

import { useEffect, useRef } from "react";
import styles from "./survey.module.css";

const LINE_COUNT = 9;
const GREEN = [63, 156, 53] as const;
const BLUE = [0, 156, 222] as const;

/**
 * SVG voice ribbon from respond-section.html — parallel strokes, green→blue,
 * soft envelope animation; boosts on hover of the parent voice tile.
 */
export default function ModeVoiceWave() {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const ns = "http://www.w3.org/2000/svg";
    const lines: { path: SVGPathElement; offset: number }[] = [];

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    for (let j = -LINE_COUNT; j <= LINE_COUNT; j++) {
      const t = Math.abs(j) / LINE_COUNT;
      const path = document.createElementNS(ns, "path");
      path.setAttribute("fill", "none");
      path.setAttribute("vector-effect", "non-scaling-stroke");
      const stroke = [0, 1, 2]
        .map((c) => Math.round(GREEN[c] + (BLUE[c] - GREEN[c]) * t))
        .join(",");
      path.setAttribute("stroke", `rgb(${stroke})`);
      path.setAttribute("stroke-width", "1.25");
      path.setAttribute(
        "stroke-opacity",
        (0.4 + 0.55 * (1 - t)).toFixed(2)
      );
      svg.appendChild(path);
      lines.push({ path, offset: j / LINE_COUNT });
    }

    let time = 0;
    let amp = 1;
    let ampTarget = 1;
    let raf = 0;
    let running = true;

    const tile = wrap.closest("[data-mode-path='voice']");
    const onEnter = () => {
      ampTarget = 1.35;
    };
    const onLeave = () => {
      ampTarget = 1;
    };
    tile?.addEventListener("mouseenter", onEnter);
    tile?.addEventListener("mouseleave", onLeave);

    const draw = () => {
      const W = 520;
      const H = 80;
      for (const line of lines) {
        let d = "";
        for (let x = 0; x <= W; x += 5) {
          const u = x / W;
          const win = Math.sin(u * Math.PI);
          const env = 0.6 + 0.4 * Math.sin(u * 5 + time * 0.7);
          const y =
            H / 2 +
            line.offset *
              34 *
              amp *
              Math.sin(u * 9.4 + time * 1.6) *
              env *
              win;
          d += `${x ? "L" : "M"}${x} ${y.toFixed(1)}`;
        }
        line.path.setAttribute("d", d);
      }
    };

    draw();

    if (!reduceMotion) {
      const loop = () => {
        if (!running) return;
        time += 0.03;
        amp += (ampTarget - amp) * 0.08;
        draw();
        raf = window.requestAnimationFrame(loop);
      };
      raf = window.requestAnimationFrame(loop);
    }

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      tile?.removeEventListener("mouseenter", onEnter);
      tile?.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.modeVoiceWave} aria-hidden="true">
      <svg
        ref={svgRef}
        className={styles.modeVoiceWaveSvg}
        viewBox="0 0 520 80"
        preserveAspectRatio="none"
      />
    </div>
  );
}
