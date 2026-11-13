export type WidgetMetric = "all" | "csat" | "ces" | "nps";

export function buildWidgetPublicUrl(
  origin: string,
  metric: WidgetMetric = "all"
) {
  const base = `${origin.replace(/\/$/, "")}/widget`;
  if (metric === "all") return base;
  return `${base}?metric=${metric}`;
}

export function buildReviewsWidgetPublicUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/widget/reviews`;
}

export function buildWidgetEmbedCode(
  origin: string,
  metric: WidgetMetric = "all",
  targetId = "rsm-voc-metrics"
) {
  return `<div id="${targetId}"></div>\n<script\n  src="${origin}/widget.js"\n  data-api="${origin}/api/public/metrics"\n  data-metric="${metric}"\n  data-target="${targetId}"\n></script>`;
}

export function buildReviewsWidgetEmbedCode(
  origin: string,
  targetId = "rsm-voc-reviews"
) {
  return `<div id="${targetId}"></div>\n<script\n  src="${origin}/widget-reviews.js"\n  data-api="${origin}/api/public/reviews"\n  data-target="${targetId}"\n></script>`;
}
