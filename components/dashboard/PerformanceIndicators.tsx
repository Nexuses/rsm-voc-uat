"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { DashboardReport } from "@/lib/dashboard-analytics";
import type { MetricKind } from "@/lib/metric-report-content";
import {
  buildCesBuckets,
  buildCsatBuckets,
  buildNpsBuckets,
  bucketsToChartData,
  METRIC_IDENTITY_COLORS,
  methodologyBucketColor,
  type RatingBucket,
} from "@/lib/rating-visuals";
import { BucketBarChart, CesGaugeChart, ShareDonutChart } from "./MetricCharts";
import { metricLabel } from "@/lib/metric-labels";
import { MetricTitle } from "./MetricIcons";
import SmileyIcon from "./SmileyIcon";
import SurveyParticipationStats from "./SurveyParticipationStats";
import type { SurveyOutreachStats } from "@/lib/survey-outreach";
import styles from "./dashboard.module.css";

type PerformanceIndicatorsProps = {
  report: DashboardReport;
  responseCount: number;
  outreach: SurveyOutreachStats;
};

export default function PerformanceIndicators({
  report,
  responseCount,
  outreach,
}: PerformanceIndicatorsProps) {
  const csatBuckets = buildCsatBuckets(report.csat.distribution);
  const npsBuckets = buildNpsBuckets(
    report.nps.promoters,
    report.nps.passives,
    report.nps.detractors
  );
  const cesBuckets = buildCesBuckets(report.ces.distribution);

  /*
   * Each tile prints its metric's definitional KPI:
   *   CSAT = % favorable (4–5) · NPS = net score (−100…+100) · CES = mean of 1–7.
   * The NPS ring therefore maps the score onto the −100…+100 range instead of
   * plotting promoter share, which is a different number (share who scored 9–10).
   */
  const npsScore = report.nps.score;
  const npsRingPercent = npsScore === null ? 0 : (npsScore + 100) / 2;

  return (
    <section
      id="overview"
      className={styles.metricsOverview}
      aria-label="CX metrics"
    >
      <header className={styles.metricsOverviewHeading}>
        <div>
          <span className={styles.metricsOverviewKicker}>Key performance</span>
          <h2>Performance indicators</h2>
        </div>
      </header>

      <SurveyParticipationStats outreach={outreach} />

      <div className={styles.summaryRow}>
        <SummaryCard
          metric="csat"
          meta={`Avg ${formatAverage(report.csat.average, 5)} · ${report.csat.count} ratings`}
          reportHref="/dashboard/reports/csat"
          visualClassName={styles.summaryCardVisualTop}
          visual={
            <ShareDonutChart
              percent={report.csat.favorablePercent}
              label="Favorable"
              ariaLabel={`CSAT ${report.csat.favorablePercent}% favorable`}
              color={METRIC_IDENTITY_COLORS.csat}
              variant="panel"
            />
          }
        />
        <SummaryCard
          metric="nps"
          meta={`${report.nps.promoterPercent}% promoters · ${report.nps.detractorPercent}% detractors · ${report.nps.count} ratings`}
          reportHref="/dashboard/reports/nps"
          visualClassName={styles.summaryCardVisualTop}
          visual={
            <ShareDonutChart
              percent={npsRingPercent}
              label="NPS score"
              centerText={formatNumber(npsScore)}
              ariaLabel={
                npsScore === null
                  ? "NPS score not available"
                  : `NPS score ${formatNumber(npsScore)}`
              }
              color={METRIC_IDENTITY_COLORS.nps}
              variant="panel"
            />
          }
        />
        <SummaryCard
          metric="ces"
          meta={`${report.ces.favorablePercent}% favorable · ${report.ces.count} ratings`}
          reportHref="/dashboard/reports/ces"
          visualClassName={styles.summaryCardVisualTop}
          visual={
            <CesGaugeChart
              value={report.ces.average}
              min={1}
              max={7}
              variant="panel"
            />
          }
        />
      </div>

      <div className={styles.breakdownSection}>
        <h3>Response breakdown</h3>
        <div className={styles.breakdownRow}>
          <BreakdownColumn metric="csat" buckets={csatBuckets} />
          <BreakdownColumn metric="nps" buckets={npsBuckets} />
          <BreakdownColumn metric="ces" buckets={cesBuckets} />
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  metric,
  meta,
  visual,
  visualClassName,
  reportHref,
}: {
  metric: MetricKind;
  meta: string;
  visual: ReactNode;
  visualClassName?: string;
  reportHref: string;
}) {
  return (
    <article className={styles.summaryCard}>
      <header className={styles.summaryCardHead}>
        <h3>
          <MetricTitle kind={metric} />
        </h3>
        <span>{meta}</span>
      </header>
      <div
        className={
          visualClassName
            ? `${styles.summaryCardVisual} ${visualClassName}`
            : styles.summaryCardVisual
        }
      >
        {visual}
      </div>
      <Link className={styles.summaryReportLink} href={reportHref}>
        See full report
      </Link>
    </article>
  );
}

function BreakdownColumn({
  metric,
  buckets,
}: {
  metric: MetricKind;
  buckets: RatingBucket[];
}) {
  const chartData = bucketsToChartData(buckets);
  const metricLabelText = metricLabel(metric);

  return (
    <div className={styles.breakdownColumn} data-kind={metric}>
      <h4>
        <MetricTitle kind={metric} />
      </h4>
      <div
        className={styles.breakdownSmileys}
        aria-hidden="true"
        style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
      >
        {buckets.map((bucket) => (
          <div
            key={bucket.id}
            style={{
              color: methodologyBucketColor(bucket.tone),
              display: "grid",
              justifyItems: "center",
            }}
          >
            <SmileyIcon
              tone={bucket.tone}
              className={styles.breakdownSmileyIcon}
            />
          </div>
        ))}
      </div>
      <BucketBarChart
        data={chartData}
        ariaLabel={`${metricLabelText} response breakdown by rating group`}
      />
    </div>
  );
}

function formatAverage(value: number | null, max: number) {
  return value === null ? "—" : `${value.toFixed(1)}/${max}`;
}

function formatNumber(value: number | null) {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
