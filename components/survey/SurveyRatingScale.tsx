"use client";

import MetricScaleRating, { type ScaleBand } from "./MetricScaleRating";

type MetricKind = "csat" | "ces" | "nps";

type SurveyRatingScaleProps = {
  metric: MetricKind;
  name: string;
  min: number;
  max: number;
  value: number | null | undefined;
  labels: Record<number, string>;
  ariaLabel: string;
  copy: {
    ratingNeutral: string;
    npsDetractors: string;
    npsPromoters: string;
    cesBandHard: string;
    cesBandEasy: string;
    csatBandLow: string;
    csatBandHigh: string;
  };
  onSelect: (score: number) => void;
};

/**
 * Static 0–10 / 1–7 / 1–5 scale. Every score is a visible button grouped under
 * its sentiment band, so the range is readable at a glance instead of having to
 * be discovered by dragging. Band spans always add up to the number of columns.
 */
function bandsFor(
  metric: MetricKind,
  copy: SurveyRatingScaleProps["copy"]
): ScaleBand[] {
  if (metric === "nps") {
    return [
      { id: "low", label: copy.npsDetractors, range: "0–6", span: 7 },
      { id: "mid", label: copy.ratingNeutral, range: "7–8", span: 2 },
      { id: "high", label: copy.npsPromoters, range: "9–10", span: 2 },
    ];
  }
  if (metric === "ces") {
    return [
      { id: "low", label: copy.cesBandHard, range: "1–3", span: 3 },
      { id: "mid", label: copy.ratingNeutral, range: "4", span: 1 },
      { id: "high", label: copy.cesBandEasy, range: "5–7", span: 3 },
    ];
  }
  return [
    { id: "low", label: copy.csatBandLow, range: "1–2", span: 2 },
    { id: "mid", label: copy.ratingNeutral, range: "3", span: 1 },
    { id: "high", label: copy.csatBandHigh, range: "4–5", span: 2 },
  ];
}

export default function SurveyRatingScale({
  metric,
  name,
  min,
  max,
  value,
  labels,
  ariaLabel,
  copy,
  onSelect,
}: SurveyRatingScaleProps) {
  return (
    <MetricScaleRating
      metric={metric}
      name={name}
      min={min}
      max={max}
      value={value}
      labels={labels}
      bands={bandsFor(metric, copy)}
      ariaLabel={ariaLabel}
      onSelect={onSelect}
    />
  );
}
