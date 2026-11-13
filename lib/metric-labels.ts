import type { MetricKind } from "@/lib/metric-report-content";

export const METRIC_SHORT_LABEL: Record<MetricKind, string> = {
  csat: "CSAT",
  nps: "NPS",
  ces: "CES",
};

export function metricLabel(kind: MetricKind) {
  return METRIC_SHORT_LABEL[kind];
}
