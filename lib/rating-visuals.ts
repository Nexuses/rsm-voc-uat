export type SmileyTone =
  | "very-positive"
  | "positive"
  | "neutral"
  | "negative"
  | "very-negative";

/** RSM brand palette from `rsm-design-system.html` (:root tokens). */
export const RSM_BRAND_COLORS = {
  navy: "#00153d",
  navyMid: "#1a3260",
  green: "#3f9c35",
  greenSatisfied: "#65b05d",
  blue: "#009cde",
  midGrey: "#919093",
  logoGrey: "#888b8d",
  bodyGrey: "#63666a",
  caution: "#e07b39",
  greenLight: "#91cb8a",
  greenDark: "#2a6e22",
} as const;

/** Red → green spectrum shared across CSAT, CES, and NPS distribution visuals. */
export const SCALE_SPECTRUM = {
  magenta: "#c4127e",
  red: "#e01e37",
  orangeRed: "#ef4923",
  orange: "#f39200",
  amber: "#f9be00",
  yellow: "#f9c500",
  lime: "#a8d55f",
  lightGreen: "#5faf4a",
  mediumGreen: "#4a9a3a",
  darkGreen: "#378b2c",
} as const;

export const CSAT_SCALE_COLORS: Record<number, string> = {
  1: SCALE_SPECTRUM.red,
  2: SCALE_SPECTRUM.orangeRed,
  3: SCALE_SPECTRUM.yellow,
  4: SCALE_SPECTRUM.lightGreen,
  5: SCALE_SPECTRUM.darkGreen,
};

export const CES_SCALE_COLORS: Record<number, string> = {
  1: SCALE_SPECTRUM.red,
  2: SCALE_SPECTRUM.orangeRed,
  3: SCALE_SPECTRUM.orange,
  4: SCALE_SPECTRUM.yellow,
  5: SCALE_SPECTRUM.lime,
  6: SCALE_SPECTRUM.lightGreen,
  7: SCALE_SPECTRUM.darkGreen,
};

export const NPS_SCALE_COLORS: Record<number, string> = {
  0: SCALE_SPECTRUM.magenta,
  1: SCALE_SPECTRUM.red,
  2: SCALE_SPECTRUM.orangeRed,
  3: SCALE_SPECTRUM.orange,
  4: SCALE_SPECTRUM.amber,
  5: SCALE_SPECTRUM.yellow,
  6: SCALE_SPECTRUM.lime,
  7: SCALE_SPECTRUM.lightGreen,
  8: SCALE_SPECTRUM.mediumGreen,
  9: "#3f8f32",
  10: SCALE_SPECTRUM.darkGreen,
};

export const NPS_SEGMENT_COLORS = {
  promoters: RSM_BRAND_COLORS.green,
  neutral: RSM_BRAND_COLORS.blue,
  detractors: RSM_BRAND_COLORS.logoGrey,
} as const;

/** Metric identity colors for cards, trends, and widgets — not the rating scale. */
export const METRIC_IDENTITY_COLORS = {
  csat: RSM_BRAND_COLORS.green,
  ces: RSM_BRAND_COLORS.logoGrey,
  nps: RSM_BRAND_COLORS.blue,
} as const;

/** Good / neutral / poor zones used by the survey slider bands and review cards. */
export type MetricBand = "low" | "mid" | "high";

export const METRIC_BAND_COLORS: Record<MetricBand, string> = {
  low: RSM_BRAND_COLORS.bodyGrey,
  mid: RSM_BRAND_COLORS.blue,
  high: RSM_BRAND_COLORS.green,
};

/**
 * Zone a single score falls into. CSAT: 1–2 poor / 3 neutral / 4–5 good.
 * CES: 1–3 hard / 4 neutral / 5–7 easy. NPS: 0–6 detractors / 7–8 neutral /
 * 9–10 promoters. Shared by the rating slider and the review summary so the
 * colours always agree.
 */
export function metricBand(
  metric: "csat" | "ces" | "nps",
  score: number
): MetricBand {
  if (metric === "nps") {
    if (score <= 6) return "low";
    if (score <= 8) return "mid";
    return "high";
  }
  if (metric === "ces") {
    if (score <= 3) return "low";
    if (score === 4) return "mid";
    return "high";
  }
  if (score <= 2) return "low";
  if (score === 3) return "mid";
  return "high";
}

/** Bucket and sentiment tones use the RSM primary palette, not the per-score spectrum. */
export const RATING_COLORS = {
  veryPositive: RSM_BRAND_COLORS.green,
  positive: RSM_BRAND_COLORS.blue,
  neutral: RSM_BRAND_COLORS.bodyGrey,
  negative: RSM_BRAND_COLORS.logoGrey,
  veryNegative: RSM_BRAND_COLORS.logoGrey,
  navy: RSM_BRAND_COLORS.navy,
} as const;

export type RatingBucket = {
  id: string;
  label: string;
  detail: string;
  count: number;
  tone: SmileyTone;
  footer: string;
};

export function buildCsatBuckets(distribution: number[]) {
  const rating = (index: number) => distribution[index] ?? 0;
  return [
    {
      id: "csat-5",
      label: "Very Satisfied",
      detail: "(Rating 5)",
      count: rating(4),
      tone: "very-positive" as const,
      footer: "Positive",
    },
    {
      id: "csat-4",
      label: "Satisfied",
      detail: "(Rating 4)",
      count: rating(3),
      tone: "positive" as const,
      footer: "Positive",
    },
    {
      id: "csat-3",
      label: "Somewhat Satisfied",
      detail: "(Rating 3)",
      count: rating(2),
      tone: "neutral" as const,
      footer: "Neutral",
    },
    {
      id: "csat-1-2",
      label: "Dissatisfied",
      detail: "(Rating 1–2)",
      count: rating(0) + rating(1),
      tone: "negative" as const,
      footer: "Negative",
    },
  ];
}

export function buildNpsBuckets(
  promoters: number,
  neutrals: number,
  detractors: number
) {
  return [
    {
      id: "nps-promoters",
      label: "Promoters",
      detail: "(Rating 9–10)",
      count: promoters,
      tone: "very-positive" as const,
      footer: "Promoters",
    },
    {
      id: "nps-neutral",
      label: "Neutral",
      detail: "(Rating 7–8)",
      count: neutrals,
      tone: "neutral" as const,
      footer: "Neutral",
    },
    {
      id: "nps-detractors",
      label: "Detractors",
      detail: "(Rating 0–6)",
      count: detractors,
      tone: "negative" as const,
      footer: "Detractors",
    },
  ];
}

export function buildCesBuckets(distribution: number[]) {
  const rating = (value: number) => distribution[value - 1] ?? 0;
  return [
    {
      id: "ces-6-7",
      label: "Very easy",
      detail: "6–7",
      count: rating(6) + rating(7),
      tone: "very-positive" as const,
      footer: "Easy",
    },
    {
      id: "ces-5",
      label: "Easy",
      detail: "5",
      count: rating(5),
      tone: "positive" as const,
      footer: "Easy",
    },
    {
      id: "ces-4",
      label: "Neutral",
      detail: "4",
      count: rating(4),
      tone: "neutral" as const,
      footer: "Neutral",
    },
    {
      id: "ces-1-3",
      label: "Difficult",
      detail: "1–3",
      count: rating(1) + rating(2) + rating(3),
      tone: "negative" as const,
      footer: "Difficult",
    },
  ];
}

export function buildCesRatingCards(distribution: number[]) {
  return Array.from({ length: 7 }, (_, index) => {
    const rating = 7 - index;
    const count = distribution[rating - 1] ?? 0;
    return {
      id: `ces-${rating}`,
      rating,
      count,
      weighted: count * rating,
      tone: cesToneForRating(rating),
      label: cesLabelForRating(rating),
    };
  });
}

export function cesToneForRating(rating: number): SmileyTone {
  if (rating >= 6) return "very-positive";
  if (rating === 5) return "positive";
  if (rating === 4) return "neutral";
  if (rating === 3) return "negative";
  return "very-negative";
}

export function cesLabelForRating(rating: number) {
  if (rating >= 6) return "Very Easy";
  if (rating === 5) return "Easy";
  if (rating === 4) return "Neutral";
  if (rating === 3) return "Difficult";
  return "Very Difficult";
}

/** CSAT report layout palette aligned with the reference dashboard mock. */
export const METHODOLOGY_COLORS = {
  positiveStrong: "#3f9c35",
  positiveLight: "#65b05d",
  neutral: "#009cde",
  negative: "#9e9e9e",
  negativeLight: "#bdbdbd",
  negativeMuted: "#d5d5d5",
} as const;

export function methodologyBucketColor(tone: SmileyTone) {
  switch (tone) {
    case "very-positive":
      return METHODOLOGY_COLORS.positiveStrong;
    case "positive":
      return METHODOLOGY_COLORS.positiveLight;
    case "neutral":
      return METHODOLOGY_COLORS.neutral;
    case "very-negative":
      return METHODOLOGY_COLORS.negativeLight;
    default:
      return METHODOLOGY_COLORS.negative;
  }
}

export function methodologyCellToneColor(tone: string) {
  switch (tone) {
    case "positive":
      return METHODOLOGY_COLORS.positiveStrong;
    case "neutral":
      return METHODOLOGY_COLORS.neutral;
    case "negative":
      return METHODOLOGY_COLORS.negative;
    default:
      return METHODOLOGY_COLORS.negative;
  }
}

export function csatReportBucketColor(tone: SmileyTone) {
  return methodologyBucketColor(tone);
}

export function toneColor(tone: SmileyTone) {
  switch (tone) {
    case "very-positive":
      return RATING_COLORS.veryPositive;
    case "positive":
      return RATING_COLORS.positive;
    case "neutral":
      return RATING_COLORS.neutral;
    case "negative":
      return RATING_COLORS.negative;
    default:
      return RATING_COLORS.veryNegative;
  }
}

export function distributionToChartData(
  distribution: number[],
  min: number,
  getColor: (rating: number) => string
) {
  return distribution.map((count, index) => {
    const rating = index + min;
    return {
      rating: String(rating),
      count,
      fill: getColor(rating),
    };
  });
}

export function csatScaleColor(rating: number) {
  return CSAT_SCALE_COLORS[rating] ?? RATING_COLORS.veryNegative;
}

/** RSM green / blue / gray methodology bar colors used in reports and PDFs. */
export const CSAT_REPORT_SCALE_COLORS: Record<number, string> = {
  5: METHODOLOGY_COLORS.positiveStrong,
  4: METHODOLOGY_COLORS.positiveLight,
  3: METHODOLOGY_COLORS.neutral,
  2: METHODOLOGY_COLORS.negative,
  1: METHODOLOGY_COLORS.negativeLight,
};

export const NPS_REPORT_SCALE_COLORS: Record<number, string> = {
  10: METHODOLOGY_COLORS.positiveStrong,
  9: METHODOLOGY_COLORS.positiveStrong,
  8: METHODOLOGY_COLORS.neutral,
  7: METHODOLOGY_COLORS.neutral,
  6: METHODOLOGY_COLORS.negative,
  5: METHODOLOGY_COLORS.negative,
  4: METHODOLOGY_COLORS.negative,
  3: METHODOLOGY_COLORS.negative,
  2: METHODOLOGY_COLORS.negativeLight,
  1: METHODOLOGY_COLORS.negativeLight,
  0: METHODOLOGY_COLORS.negativeMuted,
};

export const CES_REPORT_SCALE_COLORS: Record<number, string> = {
  7: METHODOLOGY_COLORS.positiveStrong,
  6: METHODOLOGY_COLORS.positiveStrong,
  5: METHODOLOGY_COLORS.positiveLight,
  4: METHODOLOGY_COLORS.neutral,
  3: METHODOLOGY_COLORS.negative,
  2: METHODOLOGY_COLORS.negative,
  1: METHODOLOGY_COLORS.negativeLight,
};

export function csatReportScaleColor(rating: number) {
  return CSAT_REPORT_SCALE_COLORS[rating] ?? RATING_COLORS.veryNegative;
}

export function npsReportScaleColor(rating: number) {
  return NPS_REPORT_SCALE_COLORS[rating] ?? RATING_COLORS.veryNegative;
}

export function cesReportScaleColor(rating: number) {
  return CES_REPORT_SCALE_COLORS[rating] ?? RATING_COLORS.veryNegative;
}

export function metricReportScaleColor(
  metric: "csat" | "ces" | "nps",
  rating: number
) {
  switch (metric) {
    case "csat":
      return csatReportScaleColor(rating);
    case "ces":
      return cesReportScaleColor(rating);
    case "nps":
      return npsReportScaleColor(rating);
  }
}

export function methodologyScaleBarSegments(metric: "csat" | "ces" | "nps") {
  if (metric === "csat") {
    return [5, 4, 3, 2, 1].map((rating) => ({
      rating: String(rating),
      color: csatReportScaleColor(rating),
    }));
  }

  if (metric === "nps") {
    return Array.from({ length: 11 }, (_, index) => 10 - index).map((rating) => ({
      rating: String(rating),
      color: npsReportScaleColor(rating),
    }));
  }

  return [7, 6, 5, 4, 3, 2, 1].map((rating) => ({
    rating: String(rating),
    color: cesReportScaleColor(rating),
  }));
}

export function npsScaleColor(rating: number) {
  return NPS_SCALE_COLORS[rating] ?? RATING_COLORS.veryNegative;
}

export function cesScaleColor(rating: number) {
  return CES_SCALE_COLORS[rating] ?? RATING_COLORS.veryNegative;
}

export function metricScaleColor(
  metric: "csat" | "ces" | "nps",
  rating: number
) {
  switch (metric) {
    case "csat":
      return csatScaleColor(rating);
    case "ces":
      return cesScaleColor(rating);
    case "nps":
      return npsScaleColor(rating);
  }
}

export function bucketsToChartData(buckets: RatingBucket[]) {
  return buckets.map((bucket) => ({
    id: bucket.id,
    label: `${bucket.label} ${bucket.detail}`,
    shortLabel: bucket.detail
      .replace(/^\(Rating\s+/i, "")
      .replace(/[()]/g, ""),
    count: bucket.count,
    fill: methodologyBucketColor(bucket.tone),
    tone: bucket.tone,
  }));
}

export function cesScorePercent(value: number | null, min: number, max: number) {
  if (value === null || max <= min) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}
