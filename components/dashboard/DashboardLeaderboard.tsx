"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import CompactDataTable from "@/components/dashboard/CompactDataTable";
import { FilterDisclosure } from "@/components/dashboard/DashboardReportFilters";
import type { DashboardWindow } from "@/lib/dashboard-analytics";
import {
  DEFAULT_LEADERBOARD_MIN_N,
  type LeaderboardDimension,
  type LeaderboardMetric,
  type LeaderboardRankedRow,
  type LeaderboardResult,
} from "@/lib/leaderboard";
import styles from "./dashboard.module.css";

const DIMENSION_TABS: Array<{ id: LeaderboardDimension; label: string }> = [
  { id: "department", label: "Department" },
  { id: "partner", label: "Partner" },
  { id: "businessManager", label: "Business manager" },
  { id: "jobManager", label: "Job manager" },
];

const METRIC_OPTIONS: Array<{ id: LeaderboardMetric; label: string }> = [
  { id: "csat", label: "CSAT" },
  { id: "ces", label: "CES" },
  { id: "nps", label: "NPS" },
];

type LeaderboardApiResponse = LeaderboardResult & {
  responseCount: number;
  window: DashboardWindow;
  dateFrom: string;
  dateTo: string;
};

function formatMetric(value: number | null, digits = 1) {
  if (value === null) return "—";
  return value.toFixed(digits);
}

function formatDelta(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

function metricValue(
  row: {
    csatAverage: number | null;
    cesAverage: number | null;
    npsScore: number | null;
  },
  metric: LeaderboardMetric
) {
  if (metric === "csat") return row.csatAverage;
  if (metric === "ces") return row.cesAverage;
  return row.npsScore;
}

export default function DashboardLeaderboard() {
  const [dimension, setDimension] = useState<LeaderboardDimension>("department");
  const [metric, setMetric] = useState<LeaderboardMetric>("csat");
  const [window, setWindow] = useState<DashboardWindow>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<LeaderboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        dimension,
        metric,
        window,
        minN: String(DEFAULT_LEADERBOARD_MIN_N),
      });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const response = await fetch(
        `/api/insights/leaderboard?${params.toString()}`
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Unable to load leaderboard");
      }
      const payload = (await response.json()) as LeaderboardApiResponse;
      setData(payload);
    } catch (loadError) {
      setData(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load leaderboard"
      );
    } finally {
      setLoading(false);
    }
  }, [dimension, metric, window, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeFilterCount =
    (window !== "all" ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const columns = useMemo<ColumnDef<LeaderboardRankedRow, unknown>[]>(
    () => [
      {
        id: "rank",
        header: "Rank",
        accessorFn: (row) => row.rank,
        cell: ({ row }) => row.original.rank,
        meta: { width: "64px" },
      },
      {
        id: "label",
        header: "Name",
        accessorFn: (row) => row.label,
        cell: ({ row }) => row.original.label,
      },
      {
        id: "n",
        header: "Responses",
        accessorFn: (row) => row.n,
        cell: ({ row }) => row.original.n,
        meta: { width: "96px" },
      },
      {
        id: "csat",
        header: "CSAT",
        accessorFn: (row) => row.csatAverage,
        cell: ({ row }) => formatMetric(row.original.csatAverage),
        meta: { width: "80px" },
      },
      {
        id: "ces",
        header: "CES",
        accessorFn: (row) => row.cesAverage,
        cell: ({ row }) => formatMetric(row.original.cesAverage),
        meta: { width: "80px" },
      },
      {
        id: "nps",
        header: "NPS",
        accessorFn: (row) => row.npsScore,
        cell: ({ row }) => formatMetric(row.original.npsScore, 0),
        meta: { width: "80px" },
      },
      {
        id: "delta",
        header: "vs firm",
        accessorFn: (row) => row.deltaVsOverall,
        cell: ({ row }) => formatDelta(row.original.deltaVsOverall),
        meta: { width: "88px" },
      },
    ],
    []
  );

  return (
    <>
      <header className={styles.topbar}>
        <div>
          <span>Voice of Clients</span>
          <h1>Leaderboard</h1>
        </div>
      </header>

      <p className={styles.message}>
        Rank survey scores by department, partner and manager for the selected
        period. Ranks use invite attribution only. Groups need at least{" "}
        {DEFAULT_LEADERBOARD_MIN_N} responses.
      </p>

      <div
        className={styles.leaderboardTabs}
        role="tablist"
        aria-label="Leaderboard dimension"
      >
        {DIMENSION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={dimension === tab.id}
            className={styles.leaderboardTab}
            data-active={dimension === tab.id ? "true" : "false"}
            onClick={() => setDimension(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.leaderboardMetricRow}>
        <span className={styles.leaderboardMetricLabel}>Rank by</span>
        <div
          className={styles.leaderboardMetricToggle}
          role="group"
          aria-label="Ranking metric"
        >
          {METRIC_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={styles.leaderboardMetricButton}
              data-active={metric === option.id ? "true" : "false"}
              onClick={() => setMetric(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <FilterDisclosure
        activeCount={activeFilterCount}
        onClear={() => {
          setWindow("all");
          setDateFrom("");
          setDateTo("");
        }}
      >
        <div className={styles.filterGroup}>
          <p className={styles.filterGroupLabel}>Period</p>
          <div className={styles.filterGroupFields}>
            <label className={styles.periodFilter}>
              <span>From</span>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </label>
            <label className={styles.periodFilter}>
              <span>To</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </label>
            <label className={styles.periodFilter}>
              <span>Reporting period</span>
              <select
                value={window}
                onChange={(event) =>
                  setWindow(event.target.value as DashboardWindow)
                }
              >
                <option value="all">All time</option>
                <option value="90d">Last 90 days</option>
                <option value="year">This year</option>
              </select>
            </label>
          </div>
        </div>
      </FilterDisclosure>

      {loading && !data ? (
        <p className={styles.message}>Loading leaderboard…</p>
      ) : null}
      {error ? (
        <p className={styles.message} data-tone="error">
          {error}{" "}
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => void load()}
          >
            Retry
          </button>
        </p>
      ) : null}

      {data ? (
        <>
          <div className={styles.leaderboardCallouts}>
            <article className={styles.leaderboardCallout} data-tone="top">
              <p className={styles.leaderboardCalloutLabel}>Top</p>
              <strong>{data.top?.label ?? "—"}</strong>
              <span>
                {data.top
                  ? `${formatMetric(metricValue(data.top, metric), metric === "nps" ? 0 : 1)} · ${data.top.n} responses`
                  : "No ranked groups yet"}
              </span>
            </article>
            <article className={styles.leaderboardCallout} data-tone="avg">
              <p className={styles.leaderboardCalloutLabel}>Firm average</p>
              <strong>
                {formatMetric(
                  metricValue(data.overall, metric),
                  metric === "nps" ? 0 : 1
                )}
              </strong>
              <span>{data.responseCount} responses in period</span>
            </article>
            <article className={styles.leaderboardCallout} data-tone="low">
              <p className={styles.leaderboardCalloutLabel}>Lowest</p>
              <strong>{data.lowest?.label ?? "—"}</strong>
              <span>
                {data.lowest
                  ? `${formatMetric(metricValue(data.lowest, metric), metric === "nps" ? 0 : 1)} · ${data.lowest.n} responses`
                  : "No ranked groups yet"}
              </span>
            </article>
          </div>

          <section className={styles.panel}>
            <header className={styles.panelHeading}>
              <span>Ranked list</span>
              <h2>
                {
                  DIMENSION_TABS.find((tab) => tab.id === dimension)?.label
                }
              </h2>
              <p>
                Sorted by {metric.toUpperCase()}.
                {data.excludedBelowMinN > 0
                  ? ` ${data.excludedBelowMinN} group${data.excludedBelowMinN === 1 ? "" : "s"} below minimum n hidden.`
                  : ""}
                {data.unlabeledCount > 0
                  ? ` ${data.unlabeledCount} response${data.unlabeledCount === 1 ? "" : "s"} without this label omitted.`
                  : ""}
              </p>
            </header>
            <CompactDataTable
              ariaLabel="Leaderboard rankings"
              columns={columns}
              data={data.rows}
              getRowId={(row) => `${row.rank}-${row.label}`}
              minWidth={720}
              maxHeight="none"
              emptyState={
                <p className={styles.message}>
                  No groups meet the minimum of {data.minN} responses for this
                  period and dimension.
                </p>
              }
            />
          </section>
        </>
      ) : null}
    </>
  );
}
