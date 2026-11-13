import { calculateCes, calculateCsat, calculateNps } from "@/lib/survey/metrics";

export const BENCHMARK_METRICS = ["csat", "ces", "nps"] as const;
export type BenchmarkMetric = (typeof BENCHMARK_METRICS)[number];

export type BenchmarkObservation = {
  submittedAt: Date;
  serviceLineCode: string | null;
  csat: number | null;
  ces: number | null;
  nps: number | null;
};

export type ComputedBenchmark = {
  dimension: "overall" | "service_line";
  dimensionKey: string;
  metric: BenchmarkMetric;
  value: number;
  sampleSize: number;
  periodStart: Date;
  periodEnd: Date;
};

export function quarterRange(date: Date) {
  const quarter = Math.floor(date.getUTCMonth() / 3);
  const start = new Date(Date.UTC(date.getUTCFullYear(), quarter * 3, 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), quarter * 3 + 3, 1) - 1);
  return { start, end, label: `${date.getUTCFullYear()}-Q${quarter + 1}` };
}

/** Same definitions as the dashboard: CSAT/CES favorable %, NPS promoters − detractors. */
export function metricValue(metric: BenchmarkMetric, ratings: number[]) {
  if (!ratings.length) return null;
  if (metric === "csat") return calculateCsat(ratings).favorablePercent;
  if (metric === "ces") return calculateCes(ratings).favorablePercent;
  return calculateNps(ratings).score;
}

export function computeInternalBenchmarks(observations: BenchmarkObservation[]): ComputedBenchmark[] {
  const groups = new Map<string, { base: Omit<ComputedBenchmark, "metric" | "value" | "sampleSize">; rows: BenchmarkObservation[] }>();
  for (const row of observations) {
    const { start, end, label } = quarterRange(row.submittedAt);
    const dimensions: Array<["overall" | "service_line", string]> = [["overall", ""]];
    if (row.serviceLineCode) dimensions.push(["service_line", row.serviceLineCode]);
    for (const [dimension, dimensionKey] of dimensions) {
      const key = `${label}|${dimension}|${dimensionKey}`;
      const group = groups.get(key) ?? {
        base: { dimension, dimensionKey, periodStart: start, periodEnd: end },
        rows: [],
      };
      group.rows.push(row);
      groups.set(key, group);
    }
  }

  const results: ComputedBenchmark[] = [];
  for (const { base, rows } of groups.values()) {
    for (const metric of BENCHMARK_METRICS) {
      const ratings = rows.map((row) => row[metric]).filter((v): v is number => v !== null);
      const value = metricValue(metric, ratings);
      if (value === null) continue;
      results.push({ ...base, metric, value, sampleSize: ratings.length });
    }
  }
  return results.sort(
    (a, b) =>
      a.periodStart.getTime() - b.periodStart.getTime() ||
      a.dimension.localeCompare(b.dimension) ||
      a.dimensionKey.localeCompare(b.dimensionKey) ||
      a.metric.localeCompare(b.metric)
  );
}

type BenchmarkRow = {
  scope: string;
  dimension: string;
  dimensionKey: string;
  metric: string;
  value: number;
  sampleSize: number | null;
  population: string | null;
  source: string;
  periodStart: Date;
  periodEnd: Date;
};

/** Internal and external figures are never blended into one number. */
export function compareBenchmarks(rows: BenchmarkRow[]) {
  const byMetric = new Map<string, { metric: string; internal: BenchmarkRow[]; external: BenchmarkRow[] }>();
  for (const row of rows) {
    const entry = byMetric.get(row.metric) ?? { metric: row.metric, internal: [], external: [] };
    if (row.scope === "internal") entry.internal.push(row);
    else if (row.scope === "external") entry.external.push(row);
    byMetric.set(row.metric, entry);
  }
  return [...byMetric.values()].sort((a, b) => a.metric.localeCompare(b.metric));
}
