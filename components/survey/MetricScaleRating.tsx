"use client";

import { metricBand, type MetricBand } from "@/lib/rating-visuals";
import styles from "./survey.module.css";

type MetricKind = "csat" | "ces" | "nps";

export type ScaleBand = {
  id: MetricBand;
  /** Band name without the range, e.g. "Promoters". */
  label: string;
  /** Inclusive score range, e.g. "9–10". Rendered unbreakable. */
  range: string;
  /** How many number columns this band covers. */
  span: number;
};

type MetricScaleRatingProps = {
  metric: MetricKind;
  /** Radio group name — one group per question field. */
  name: string;
  min: number;
  max: number;
  value: number | null | undefined;
  labels: Record<number, string>;
  bands: ScaleBand[];
  ariaLabel: string;
  onSelect: (score: number) => void;
};

/** Frown / flat / smile, one per band — matches nps-scale-static.html. */
const BAND_MOUTHS: Record<MetricBand, string> = {
  low: "M8 16.5q4-3.5 8 0",
  mid: "M8.5 15.5h7",
  high: "M7.5 14q4.5 4.5 9 0",
};

export default function MetricScaleRating({
  metric,
  name,
  min,
  max,
  value,
  labels,
  bands,
  ariaLabel,
  onSelect,
}: MetricScaleRatingProps) {
  const span = Math.max(max - min, 1);
  const columns = span + 1;
  const scores = Array.from({ length: columns }, (_, index) => min + index);
  const rated = typeof value === "number" && value >= min && value <= max;
  const selectedBand = rated ? metricBand(metric, value) : null;

  return (
    <fieldset
      className={styles.ratingScale}
      data-metric={metric}
      data-rated={rated ? "true" : "false"}
      aria-label={ariaLabel}
    >
      {/* No <legend>: the question is already rendered in the step heading, and
          a legend would duplicate that text for tests and screen readers. The
          fieldset is named by aria-label instead. */}

      {/* Region strip: one face per band, spanning the numbers it covers. */}
      <div
        className={styles.ratingScaleRegions}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {bands.map((band) => (
          <div
            key={band.id}
            className={styles.ratingScaleRegion}
            data-band={band.id}
            data-active={selectedBand === band.id ? "true" : "false"}
            style={{ gridColumn: `span ${band.span}` }}
          >
            <svg
              className={styles.ratingScaleFace}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
              <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
              <path d={BAND_MOUTHS[band.id]} />
            </svg>
            <span className={styles.ratingScaleRegionName}>
              {band.label}{" "}
              {/* The range must never break: in Arabic "(9–10)" wrapped after
                  the dash and read as "(9–" / "10)". */}
              <span className={styles.ratingScaleRegionRange}>
                ({band.range})
              </span>
            </span>
          </div>
        ))}
      </div>

      <div
        className={styles.ratingScaleNumbers}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {scores.map((score) => {
          const id = `${name}-${score}`;
          const band = metricBand(metric, score);
          return (
            <span key={score} className={styles.ratingScaleCell}>
              <input
                className={styles.ratingScaleInput}
                type="radio"
                id={id}
                name={name}
                value={score}
                checked={value === score}
                data-band={band}
                aria-label={`${labels[score] ?? score} — ${score} / ${max}`}
                onChange={() => onSelect(score)}
              />
              <label
                className={styles.ratingScaleLabel}
                htmlFor={id}
                data-band={band}
              >
                {score}
              </label>
            </span>
          );
        })}
      </div>
    </fieldset>
  );
}
