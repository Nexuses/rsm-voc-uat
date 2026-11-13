import {
  type DashboardWindow,
  withinDashboardWindow,
} from "@/lib/dashboard-analytics";
import { withinCalendarRange } from "@/lib/dashboard-report-filters";
import { calculateCes, calculateCsat, calculateNps } from "@/lib/survey/metrics";
import { normalizeOrgLabel } from "@/lib/survey-org-structure";

export const LEADERBOARD_DIMENSIONS = [
  "department",
  "partner",
  "businessManager",
  "jobManager",
] as const;

export type LeaderboardDimension = (typeof LEADERBOARD_DIMENSIONS)[number];

export const LEADERBOARD_METRICS = ["csat", "ces", "nps"] as const;

export type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number];

export const DEFAULT_LEADERBOARD_MIN_N = 3;

export type LeaderboardSourceRow = {
  submittedAt: string;
  csatScore: number | null;
  cesScore: number | null;
  npsScore: number | null;
  department: string | null;
  partner: string | null;
  businessManagerName: string | null;
  jobManagerName: string | null;
};

export type LeaderboardGroupMetrics = {
  label: string;
  n: number;
  csatAverage: number | null;
  cesAverage: number | null;
  npsScore: number | null;
};

export type LeaderboardRankedRow = LeaderboardGroupMetrics & {
  rank: number;
  deltaVsOverall: number | null;
};

export type LeaderboardResult = {
  dimension: LeaderboardDimension;
  metric: LeaderboardMetric;
  minN: number;
  overall: LeaderboardGroupMetrics;
  top: LeaderboardRankedRow | null;
  average: LeaderboardGroupMetrics;
  lowest: LeaderboardRankedRow | null;
  rows: LeaderboardRankedRow[];
  excludedBelowMinN: number;
  unlabeledCount: number;
};

const DIMENSION_FIELD: Record<
  LeaderboardDimension,
  keyof Pick<
    LeaderboardSourceRow,
    "department" | "partner" | "businessManagerName" | "jobManagerName"
  >
> = {
  department: "department",
  partner: "partner",
  businessManager: "businessManagerName",
  jobManager: "jobManagerName",
};

export function isLeaderboardDimension(
  value: string
): value is LeaderboardDimension {
  return (LEADERBOARD_DIMENSIONS as readonly string[]).includes(value);
}

export function isLeaderboardMetric(value: string): value is LeaderboardMetric {
  return (LEADERBOARD_METRICS as readonly string[]).includes(value);
}

export function filterLeaderboardRows(
  rows: LeaderboardSourceRow[],
  window: DashboardWindow,
  dateFrom: string,
  dateTo: string
) {
  return rows.filter((row) => {
    if (!withinDashboardWindow(row.submittedAt, window)) return false;
    return withinCalendarRange(row.submittedAt, dateFrom, dateTo);
  });
}

function displayLabel(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(/\s+/g, " ");
}

function metricSortValue(
  group: LeaderboardGroupMetrics,
  metric: LeaderboardMetric
): number | null {
  if (metric === "csat") return group.csatAverage;
  if (metric === "ces") return group.cesAverage;
  return group.npsScore;
}

function roundMetric(value: number | null) {
  return value === null ? null : Number(value.toFixed(2));
}

function computeGroupMetrics(
  label: string,
  scores: { csat: number[]; ces: number[]; nps: number[] }
): LeaderboardGroupMetrics {
  const csat = calculateCsat(scores.csat);
  const ces = calculateCes(scores.ces);
  const nps = calculateNps(scores.nps);
  return {
    label,
    n: Math.max(scores.csat.length, scores.ces.length, scores.nps.length),
    csatAverage: roundMetric(csat.average),
    cesAverage: roundMetric(ces.average),
    npsScore: roundMetric(nps.score),
  };
}

/**
 * Rank invite-attributed responses by department, partner, or manager.
 * Blank labels are omitted from ranked rows but counted in unlabeledCount.
 * Groups below minN are omitted from the ranked table.
 */
export function buildLeaderboard(input: {
  rows: LeaderboardSourceRow[];
  dimension: LeaderboardDimension;
  metric?: LeaderboardMetric;
  minN?: number;
}): LeaderboardResult {
  const metric = input.metric ?? "csat";
  const minN = input.minN ?? DEFAULT_LEADERBOARD_MIN_N;
  const field = DIMENSION_FIELD[input.dimension];

  const buckets = new Map<
    string,
    { label: string; csat: number[]; ces: number[]; nps: number[] }
  >();
  let unlabeledCount = 0;

  const allCsat: number[] = [];
  const allCes: number[] = [];
  const allNps: number[] = [];

  for (const row of input.rows) {
    if (typeof row.csatScore === "number") allCsat.push(row.csatScore);
    if (typeof row.cesScore === "number") allCes.push(row.cesScore);
    if (typeof row.npsScore === "number") allNps.push(row.npsScore);

    const raw = row[field];
    const key = normalizeOrgLabel(raw);
    if (!key) {
      unlabeledCount += 1;
      continue;
    }
    const existing = buckets.get(key) ?? {
      label: displayLabel(String(raw)),
      csat: [],
      ces: [],
      nps: [],
    };
    if (typeof row.csatScore === "number") existing.csat.push(row.csatScore);
    if (typeof row.cesScore === "number") existing.ces.push(row.cesScore);
    if (typeof row.npsScore === "number") existing.nps.push(row.npsScore);
    buckets.set(key, existing);
  }

  const overall = computeGroupMetrics("Firm overall", {
    csat: allCsat,
    ces: allCes,
    nps: allNps,
  });
  overall.n = input.rows.length;

  const overallSort = metricSortValue(overall, metric);

  let excludedBelowMinN = 0;
  const qualified: LeaderboardGroupMetrics[] = [];
  for (const bucket of buckets.values()) {
    const group = computeGroupMetrics(bucket.label, bucket);
    group.n = Math.max(bucket.csat.length, bucket.ces.length, bucket.nps.length);
    if (group.n < minN) {
      excludedBelowMinN += 1;
      continue;
    }
    qualified.push(group);
  }

  qualified.sort((a, b) => {
    const aVal = metricSortValue(a, metric);
    const bVal = metricSortValue(b, metric);
    if (aVal === null && bVal === null) {
      return a.label.localeCompare(b.label);
    }
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    if (bVal !== aVal) return bVal - aVal;
    return a.label.localeCompare(b.label);
  });

  const rows: LeaderboardRankedRow[] = qualified.map((group, index) => {
    const value = metricSortValue(group, metric);
    return {
      ...group,
      rank: index + 1,
      deltaVsOverall:
        value === null || overallSort === null
          ? null
          : roundMetric(value - overallSort),
    };
  });

  return {
    dimension: input.dimension,
    metric,
    minN,
    overall,
    top: rows[0] ?? null,
    average: overall,
    lowest: rows.length ? rows[rows.length - 1]! : null,
    rows,
    excludedBelowMinN,
    unlabeledCount,
  };
}
