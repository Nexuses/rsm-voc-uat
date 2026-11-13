"use client";

import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cesScorePercent, METRIC_IDENTITY_COLORS } from "@/lib/rating-visuals";
import styles from "./dashboard.module.css";

type ChartDatum = {
  rating: string;
  count: number;
  fill: string;
};

type BucketChartDatum = {
  id: string;
  label: string;
  shortLabel: string;
  count: number;
  fill: string;
};

export function BucketDonutChart({
  buckets,
  total,
  centerLabel,
  variant = "default",
}: {
  buckets: Array<{ count: number; fill: string }>;
  total: number;
  centerLabel: string;
  variant?: "default" | "sentiment";
}) {
  const segments = buckets.filter((bucket) => bucket.count > 0);
  const data =
    segments.length > 0
      ? segments.map((bucket, index) => ({
          name: `segment-${index}`,
          value: bucket.count,
          fill: bucket.fill,
        }))
      : [{ name: "empty", value: 1, fill: "#e8edf0" }];

  const sizes =
    variant === "sentiment"
      ? { height: 148, inner: 46, outer: 66, className: styles.metricSentimentDonut }
      : { height: 150, inner: 48, outer: 68, className: styles.shareDonut };

  return (
    <div
      className={sizes.className}
      role="img"
      aria-label={`${total} ${centerLabel.toLowerCase()}`}
    >
      <ResponsiveContainer width="100%" height={sizes.height}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={sizes.inner}
            outerRadius={sizes.outer}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            paddingAngle={segments.length > 1 ? 1 : 0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className={styles.metricSentimentDonutCenter}>
        <strong>{total}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  );
}

export function BucketBarChart({
  data,
  ariaLabel,
}: {
  data: BucketChartDatum[];
  ariaLabel: string;
}) {
  if (!data.some((item) => item.count > 0)) {
    return <p className={styles.chartEmpty}>No responses in this group yet.</p>;
  }

  return (
    <div className={styles.chartWrap} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={168}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 6, left: 0, bottom: 12 }}
        >
          <XAxis
            dataKey="shortLabel"
            tick={{ fill: "#63666a", fontSize: 10 }}
            axisLine={{ stroke: "#d1d3d4" }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#63666a", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={24}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,21,61,0.04)" }}
            formatter={(value) => [value ?? 0, "Responses"]}
            labelFormatter={(_label, payload) =>
              payload?.[0]?.payload?.label ?? _label
            }
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((entry) => (
              <Cell key={entry.id} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionBarChart({
  data,
  ariaLabel,
  compact = false,
}: {
  data: ChartDatum[];
  ariaLabel: string;
  compact?: boolean;
}) {
  if (!data.some((item) => item.count > 0)) {
    return <p className={styles.chartEmpty}>No ratings yet.</p>;
  }

  return (
    <div className={styles.chartWrap} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={compact ? 120 : 180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="rating"
            tick={{ fill: "#63666a", fontSize: 12 }}
            axisLine={{ stroke: "#d1d3d4" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#63666a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,21,61,0.04)" }}
            formatter={(value) => [value ?? 0, "Responses"]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={42}>
            {data.map((entry) => (
              <Cell key={entry.rating} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ShareDonutChart({
  percent,
  label,
  color,
  variant = "compact",
  centerText,
  ariaLabel,
}: {
  percent: number;
  label: string;
  color: string;
  variant?: "compact" | "kpi" | "panel" | "method";
  /**
   * Overrides the centre figure. `percent` still drives the ring geometry, so a
   * metric whose score is not a 0–100 share (NPS runs −100 to +100) can draw
   * the ring at its normalised position while printing the real score.
   */
  centerText?: string;
  /** Accessible name. Defaults to `${label} ${percent}%`. */
  ariaLabel?: string;
}) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const data = [
    { name: "share", value: safePercent, fill: color },
    { name: "rest", value: 100 - safePercent, fill: "#e8edf0" },
  ];
  const sizes =
    variant === "panel"
      ? { height: 172, inner: 54, outer: 76, className: styles.panelDonut }
      : variant === "kpi"
        ? { height: 168, inner: 54, outer: 76, className: styles.kpiDonut }
        : variant === "method"
          ? { height: 100, inner: 30, outer: 42, className: styles.methodDonut }
          : { height: 150, inner: 48, outer: 68, className: styles.shareDonut };
  const chartMargin =
    variant === "panel"
      ? { top: 8, right: 8, bottom: 8, left: 8 }
      : { top: 0, right: 0, bottom: 0, left: 0 };

  return (
    <div
      className={sizes.className}
      role="img"
      aria-label={ariaLabel ?? `${label} ${safePercent}%`}
    >
      <ResponsiveContainer width="100%" height={sizes.height}>
        <PieChart margin={chartMargin}>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={sizes.inner}
            outerRadius={sizes.outer}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            paddingAngle={safePercent > 0 && safePercent < 100 ? 2 : 0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div
        className={
          variant === "panel"
            ? styles.panelDonutCenter
            : variant === "kpi"
              ? styles.kpiDonutCenter
              : variant === "method"
                ? styles.methodDonutCenter
                : styles.shareDonutCenter
        }
      >
        <strong style={{ color }}>{centerText ?? `${safePercent}%`}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function CesGaugeChart({
  value,
  min,
  max,
  label = "CES",
  variant = "kpi",
}: {
  value: number | null;
  min: number;
  max: number;
  label?: string;
  variant?: "kpi" | "panel" | "method";
}) {
  const percent = cesScorePercent(value, min, max);
  const safePercent = Math.max(0, Math.min(100, percent));
  // Metric identity color (CES) — rating-scale tones stay elsewhere.
  const fill = METRIC_IDENTITY_COLORS.ces;
  const geometry = getCesGaugeGeometry(variant);
  const { width, height, cx, cy, innerR, outerR } = geometry;
  const midR = (innerR + outerR) / 2;
  const strokeWidth = outerR - innerR;
  const arcPath = describeGaugeArc(cx, cy, midR, min, max);
  const arcLength = Math.PI * midR;
  const filledLength = (safePercent / 100) * arcLength;
  const ticks = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  const markerValue =
    value === null ? null : Math.max(min, Math.min(max, value));
  const markerPoint =
    markerValue === null
      ? null
      : gaugePoint(cx, cy, midR, markerValue, min, max);
  const chartPaddingTop = variant === "panel" ? 4 : 0;
  const svgRenderHeight = height - chartPaddingTop;
  const baselinePercent =
    ((chartPaddingTop + (cy / height) * svgRenderHeight) / height) * 100;

  const displayValue =
    value === null ? "—" : `${value.toFixed(1)}/${max}`;
  const ariaValue =
    value === null
      ? "no data"
      : `average ${value.toFixed(1)} out of ${max}`;

  const gaugeClassName =
    variant === "panel"
      ? styles.panelGauge
      : variant === "method"
        ? styles.methodGauge
        : styles.kpiGauge;

  return (
    <div
      className={gaugeClassName}
      role="img"
      aria-label={`${label} ${ariaValue}`}
    >
      <div
        className={styles.gaugeChartArea}
        style={
          variant === "method"
            ? undefined
            : ({ "--gauge-baseline": `${baselinePercent}%` } as CSSProperties)
        }
      >
        <svg
          className={styles.cesGaugeSvg}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <path
            d={arcPath}
            className={styles.cesGaugeTrack}
            strokeWidth={strokeWidth}
          />
          <path
            d={arcPath}
            className={styles.cesGaugeFill}
            stroke={fill}
            strokeWidth={strokeWidth}
            strokeDasharray={`${filledLength} ${arcLength}`}
          />
          {variant !== "method"
            ? ticks.map((tick) => {
                const tickInner = gaugePoint(cx, cy, innerR + 4, tick, min, max);
                const tickOuter = gaugePoint(cx, cy, outerR - 4, tick, min, max);
                const labelPoint = gaugePoint(
                  cx,
                  cy,
                  innerR - 13,
                  tick,
                  min,
                  max
                );

                return (
                  <g key={tick}>
                    <line
                      x1={tickInner.x}
                      y1={tickInner.y}
                      x2={tickOuter.x}
                      y2={tickOuter.y}
                      className={styles.cesGaugeTickLine}
                    />
                    <text
                      x={labelPoint.x}
                      y={labelPoint.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={styles.cesGaugeTickLabel}
                    >
                      {tick}
                    </text>
                  </g>
                );
              })
            : null}
          {markerPoint ? (
            <circle
              cx={markerPoint.x}
              cy={markerPoint.y}
              r={variant === "method" ? 3.5 : 4.5}
              fill={fill}
              className={styles.cesGaugeMarker}
            />
          ) : null}
        </svg>
        {variant !== "method" ? (
          <div className={styles.gaugeScoreFoot} aria-hidden="true">
            <strong style={{ color: METRIC_IDENTITY_COLORS.ces }}>
              {displayValue}
            </strong>
            <span>Avg ease score</span>
          </div>
        ) : null}
      </div>
      {variant === "kpi" || variant === "panel" ? (
        <div className={styles.gaugeFooter}>
          <div className={styles.gaugeScaleMin} aria-hidden="true">
            <small>Difficult</small>
          </div>
          <div className={styles.gaugeScaleMax} aria-hidden="true">
            <small>Easy</small>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type CesGaugeGeometry = {
  width: number;
  height: number;
  cx: number;
  cy: number;
  innerR: number;
  outerR: number;
};

function getCesGaugeGeometry(variant: "kpi" | "panel" | "method"): CesGaugeGeometry {
  if (variant === "method") {
    return {
      width: 100,
      height: 56,
      cx: 50,
      cy: 52,
      innerR: 34,
      outerR: 42,
    };
  }

  const width = 252;
  const height = variant === "panel" ? 158 : 152;
  const innerR = variant === "panel" ? 86 : 78;
  const outerR = variant === "panel" ? 110 : 108;

  return {
    width,
    height,
    cx: width / 2,
    cy: height * 0.82,
    innerR,
    outerR,
  };
}

function gaugePoint(
  cx: number,
  cy: number,
  radius: number,
  value: number,
  min: number,
  max: number
) {
  const ratio = (value - min) / (max - min);
  const angleDeg = 180 - ratio * 180;
  const angleRad = (angleDeg * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy - radius * Math.sin(angleRad),
  };
}

function describeGaugeArc(
  cx: number,
  cy: number,
  radius: number,
  min: number,
  max: number,
  startValue: number = min,
  endValue: number = max
) {
  const start = gaugePoint(cx, cy, radius, startValue, min, max);
  const end = gaugePoint(cx, cy, radius, endValue, min, max);

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

type TrendRow = {
  period: string;
  label: string;
  csat: number | null;
  ces: number | null;
  nps: number | null;
};

type TrendChartDatum = TrendRow & {
  csatIndex: number | null;
  cesIndex: number | null;
  npsIndex: number | null;
};

const TREND_COLORS = {
  csat: "#3f9c35",
  ces: "#888b8d",
  nps: "#009cde",
} as const;

export function ExperienceTrendChart({ rows }: { rows: TrendRow[] }) {
  if (!rows.length) {
    return (
      <p className={styles.trendEmpty}>
        Monthly trends appear after responses are received.
      </p>
    );
  }

  const latest = rows[rows.length - 1]!;
  const data: TrendChartDatum[] = rows.map((row) => ({
    ...row,
    csatIndex: trendScaleIndex(row.csat, 5),
    cesIndex: trendScaleIndex(row.ces, 7),
    npsIndex: trendNpsScaleIndex(row.nps),
  }));

  return (
    <div className={styles.trendChart}>
      <div className={styles.trendChartCanvas} role="img" aria-label="Monthly experience trend">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid stroke="#e8edf0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#63666a", fontSize: 10 }}
              axisLine={{ stroke: "#d1d3d4" }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: "#63666a", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={<TrendTooltip />}
              cursor={{ fill: "rgba(0,21,61,0.04)" }}
            />
            <Bar
              dataKey="csatIndex"
              fill={TREND_COLORS.csat}
              name="CSAT"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="cesIndex"
              fill={TREND_COLORS.ces}
              name="CES"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="npsIndex"
              fill={TREND_COLORS.nps}
              name="NPS"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.trendLegend}>
        <span>
          <i className={styles.legendCsat} />
          CSAT {formatTrendMetric(latest.csat, 5)}
        </span>
        <span>
          <i className={styles.legendCes} />
          CES {formatTrendMetric(latest.ces, 7)}
        </span>
        <span>
          <i className={styles.legendNps} />
          NPS {formatTrendNumber(latest.nps)}
        </span>
      </div>
    </div>
  );
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TrendChartDatum }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as TrendChartDatum | undefined;
  if (!row) return null;

  return (
    <div className={styles.trendTooltip}>
      <strong>{label}</strong>
      <ul>
        <li>
          <span>CSAT</span> {formatTrendMetric(row.csat, 5)}
        </li>
        <li>
          <span>CES</span> {formatTrendMetric(row.ces, 7)}
        </li>
        <li>
          <span>NPS</span> {formatTrendNumber(row.nps)}
        </li>
      </ul>
    </div>
  );
}

function trendScaleIndex(value: number | null, max: number) {
  if (value === null || max <= 0) return null;
  return Math.round((value / max) * 100);
}

function trendNpsScaleIndex(value: number | null) {
  if (value === null) return null;
  return Math.round(((value + 100) / 200) * 100);
}

function formatTrendMetric(value: number | null, max: number) {
  return value === null ? "—" : `${value.toFixed(1)}/${max}`;
}

function formatTrendNumber(value: number | null) {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
