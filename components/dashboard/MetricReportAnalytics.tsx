"use client";

import type { CSSProperties } from "react";
import {
  BucketDonutChart,
  CesGaugeChart,
  ShareDonutChart,
} from "@/components/dashboard/MetricCharts";
import MetricMethodologyCard from "@/components/dashboard/MetricMethodologyCard";
import type { DashboardReport } from "@/lib/dashboard-analytics";
import { metricLabel } from "@/lib/metric-labels";
import type { DashboardInsight } from "@/components/dashboard/types";
import type { MetricKind, MetricReportContent } from "@/lib/metric-report-content";
import { buildSurveyChannelBreakdown } from "@/lib/survey-channel-stats";
import {
  methodologyBucketColor,
  type RatingBucket,
} from "@/lib/rating-visuals";
import type { SurveyOutreachStats } from "@/lib/survey-outreach";
import styles from "./dashboard.module.css";

type MetricReportAnalyticsProps = {
  metric: MetricKind;
  content: MetricReportContent;
  outreach: SurveyOutreachStats;
  report: DashboardReport;
  items: DashboardInsight[];
};

export default function MetricReportAnalytics({
  metric,
  content,
  outreach,
  report,
  items,
}: MetricReportAnalyticsProps) {
  const bucketTotal = content.buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const positiveCount =
    metric === "csat"
      ? content.buckets[0].count + content.buckets[1].count
      : metric === "nps"
        ? content.buckets[0].count
        : content.buckets[0].count + content.buckets[1].count;
  const insights = buildInsightCards(metric, content, outreach, positiveCount, bucketTotal);
  const channelSegments = buildSurveyChannelBreakdown(items, metric);

  return (
    <>
      <div className={styles.metricReportRow}>
        <OverallScoreCard
          metric={metric}
          content={content}
          report={report}
          positiveCount={positiveCount}
          total={bucketTotal}
        />
        <SentimentDistributionCard
          buckets={content.buckets}
          total={bucketTotal}
          metric={metric}
        />
      </div>

      <div className={styles.metricReportRow}>
        <SurveyChannelCard
          segments={channelSegments}
          total={bucketTotal}
          metric={metric}
        />
        <MetricMethodologyCard
          content={content}
          report={report}
          positiveCount={positiveCount}
          total={bucketTotal}
        />
      </div>

      <section className={styles.metricReportInsights} aria-label="Customer insights">
        <header className={styles.metricReportInsightsHeader}>
          <h2>Customer insights</h2>
          <p>Key takeaways drawn directly from the Voice of Clients results.</p>
        </header>
        <div className={styles.metricReportInsightsGrid}>
          {insights.map((insight) => (
            <article
              key={insight.tag}
              className={styles.metricReportInsightCard}
              data-tag={insight.tagKind}
            >
              <div className={styles.metricReportInsightTop}>
                {insight.icon}
                <span className={styles.metricReportInsightTag}>{insight.tag}</span>
              </div>
              <p className={styles.metricReportInsightValue}>{insight.value}</p>
              <p className={styles.metricReportInsightTitle}>{insight.title}</p>
              <p className={styles.metricReportInsightBody}>{insight.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

/*
 * The hero slot belongs to the metric's definitional score. Promoter share is a
 * different number from NPS (share who scored 9-10 vs promoters minus
 * detractors), so on the NPS page the donut prints the net score and maps it
 * onto the -100..+100 range; promoter/detractor shares sit in the caption. CSAT
 * and CES keep their own scores — % favorable and the 1-7 mean.
 */
function heroFigure(
  metric: MetricKind,
  content: MetricReportContent,
  report: DashboardReport
): {
  percent: number;
  label: string;
  centerText?: string;
  ariaLabel: string;
} {
  if (metric === "nps") {
    const score = report.nps.score;
    return {
      percent: score === null ? 0 : (score + 100) / 2,
      label: "NPS score",
      centerText: content.scoreDisplay,
      ariaLabel:
        score === null
          ? "NPS score not available"
          : `NPS score ${content.scoreDisplay}`,
    };
  }
  if (metric === "csat") {
    return {
      percent: report.csat.favorablePercent,
      label: "CSAT",
      centerText: undefined,
      ariaLabel: `CSAT ${report.csat.favorablePercent}%`,
    };
  }
  return {
    percent: report.ces.favorablePercent,
    label: "CES",
    centerText: undefined,
    ariaLabel: `CES ${report.ces.favorablePercent}% favorable`,
  };
}

function OverallScoreCard({
  metric,
  content,
  report,
  positiveCount,
  total,
}: {
  metric: MetricKind;
  content: MetricReportContent;
  report: DashboardReport;
  positiveCount: number;
  total: number;
}) {
  const hero = heroFigure(metric, content, report);
  const subtitle =
    metric === "csat"
      ? "Positive responses (4 + 5) ÷ total"
      : metric === "nps"
        ? `${report.nps.promoterPercent}% promoters − ${report.nps.detractorPercent}% detractors`
        : "Average ease score on the 1–7 scale";

  return (
    <article
      className={styles.metricReportCard}
      style={{ "--metric-accent": content.accent } as CSSProperties}
      aria-label={`${content.title} overall score`}
    >
      <div className={styles.metricReportCardHead}>
        <div>
          <h2 className={styles.metricReportCardTitle}>{content.title}</h2>
          <p className={styles.metricReportCardSub}>{subtitle}</p>
        </div>
      </div>

      <div className={styles.metricReportCardBody}>
        <div className={styles.metricReportDonutWrap}>
          {metric === "ces" ? (
            <CesGaugeChart
              value={parseCesAverage(content.scoreDisplay)}
              min={1}
              max={7}
              variant="panel"
            />
          ) : (
            <ShareDonutChart
              percent={hero.percent}
              label={hero.label}
              centerText={hero.centerText}
              ariaLabel={hero.ariaLabel}
              color={content.accent}
              variant="panel"
            />
          )}
        </div>
      </div>

      <div className={styles.metricReportScoreFoot}>
        <div>
          <strong>{positiveCount}</strong>
          <span>
            {metric === "csat"
              ? "Positive (4 + 5)"
              : metric === "nps"
                ? "Promoters (9 + 10)"
                : "Easy or very easy"}
          </span>
        </div>
        <div>
          <strong>{total}</strong>
          <span>Total responses</span>
        </div>
      </div>
    </article>
  );
}

function SentimentDistributionCard({
  buckets,
  total,
  metric,
}: {
  buckets: RatingBucket[];
  total: number;
  metric: MetricKind;
}) {
  const donutBuckets = buckets.map((bucket) => ({
    count: bucket.count,
    fill: methodologyBucketColor(bucket.tone),
  }));

  return (
    <article className={styles.metricReportCard} aria-label="Sentiment distribution">
      <header className={styles.metricReportCardHead}>
        <h2 className={styles.metricReportCardTitle}>Sentiment distribution</h2>
        <p className={styles.metricReportCardSub}>
          {total > 0
            ? `${total} responses across the ${metric === "nps" ? "0–10" : metric === "ces" ? "7-point" : "5-point"} scale`
            : "No responses in the selected period"}
        </p>
      </header>

      <div className={styles.metricReportCardBody}>
        {total > 0 ? (
          <div className={styles.metricReportSentimentRow}>
            <BucketDonutChart
              buckets={donutBuckets}
              total={total}
              centerLabel="Responses"
              variant="sentiment"
            />
            <ul className={styles.metricReportSentimentList}>
              {buckets.map((bucket) => {
                const pct = total > 0 ? ((bucket.count / total) * 100).toFixed(1) : "0.0";
                return (
                  <li key={bucket.id}>
                    <div className={styles.metricReportSentimentLeft}>
                      <i style={{ background: methodologyBucketColor(bucket.tone) }} />
                      <div>
                        <strong>{bucket.label}</strong>
                        <span>{bucket.footer}</span>
                      </div>
                    </div>
                    <div className={styles.metricReportSentimentRight}>
                      <strong>{bucket.count}</strong>
                      <span>{pct}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className={styles.metricReportEmpty}>Ratings will appear here once responses are received.</p>
        )}
      </div>
    </article>
  );
}

function SurveyChannelCard({
  segments,
  total,
  metric,
}: {
  segments: ReturnType<typeof buildSurveyChannelBreakdown>;
  total: number;
  metric: MetricKind;
}) {
  const maxCount = Math.max(...segments.map((segment) => segment.count), 1);
  const metricName = metricLabel(metric);

  return (
    <article className={styles.metricReportCard} aria-label="Survey channel breakdown">
      <header className={styles.metricReportCardHead}>
        <h2 className={styles.metricReportCardTitle}>Survey channel</h2>
        <p className={styles.metricReportCardSub}>
          How {metricName} responses were captured by language and collection method
        </p>
      </header>

      <div className={styles.metricReportCardBody}>
        <div className={styles.metricReportLegend}>
          {segments.map((segment) => (
            <span key={segment.id}>
              <i style={{ background: segment.color }} />
              {segment.label}
            </span>
          ))}
        </div>

        {total > 0 ? (
          <div className={styles.metricReportBarRows}>
            {segments.map((segment) => {
              const width = Math.max(0.5, (segment.count / maxCount) * 100);
              const pct = ((segment.count / total) * 100).toFixed(1);
              return (
                <div key={segment.id} className={styles.metricReportBarItem}>
                  <span className={styles.metricReportBarName}>
                    <span className={styles.metricReportChannelLabel}>{segment.label}</span>
                    <small>{segment.detail}</small>
                  </span>
                  <div className={styles.metricReportBarTrack}>
                    <i
                      style={{
                        width: `${width}%`,
                        background: segment.color,
                      }}
                    />
                  </div>
                  <strong>
                    {segment.count}
                    <small>{pct}%</small>
                  </strong>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.metricReportEmpty}>
            Channel breakdown appears once {metricName} responses are received.
          </p>
        )}
      </div>

      {total > 0 ? (
        <p className={styles.metricReportChannelNote}>
          Voice total includes English and Arabic voice responses. Text is the typed survey path.
        </p>
      ) : null}
    </article>
  );
}

function buildInsightCards(
  metric: MetricKind,
  content: MetricReportContent,
  outreach: SurveyOutreachStats,
  positiveCount: number,
  total: number
) {
  const negativeBucket = content.buckets[content.buckets.length - 1];
  const responseRate =
    outreach.surveysSent > 0
      ? Math.round((outreach.responsesReceived / outreach.surveysSent) * 100)
      : 0;

  if (metric === "csat") {
    return [
      {
        tag: "Strength",
        tagKind: "strength",
        value: content.scoreDisplay,
        title: "Overwhelmingly positive sentiment",
        body: `${positiveCount} of ${total} client${total === 1 ? "" : "s"} rated us 4 or 5 on the 5-point scale, signalling consistently strong service quality.`,
        icon: <InsightBulbIcon />,
      },
      {
        tag: "Highlight",
        tagKind: "highlight",
        value: String(negativeBucket.count),
        title: "Dissatisfaction signal",
        body:
          negativeBucket.count === 0
            ? "No responses landed in the dissatisfied tier (rating 1–2) in this period."
            : `${negativeBucket.count} response${negativeBucket.count === 1 ? "" : "s"} landed in the dissatisfied tier (rating 1–2).`,
        icon: <InsightClockIcon />,
      },
      {
        tag: "Watch Area",
        tagKind: "watch",
        value: `${responseRate}%`,
        title: "Survey engagement",
        body:
          outreach.surveysSent > 0
            ? `${outreach.responsesReceived} of ${outreach.surveysSent} surveys returned. Participation rate gives the CSAT score statistical weight.`
            : "Survey outreach counts will appear once invitation emails are sent.",
        icon: <InsightTrendIcon />,
      },
    ];
  }

  if (metric === "nps") {
    return [
      {
        tag: "Strength",
        tagKind: "strength",
        value: content.scoreDisplay,
        title: content.insightTitle,
        body: content.insightBody,
        icon: <InsightBulbIcon />,
      },
      {
        tag: "Highlight",
        tagKind: "highlight",
        value: String(content.buckets[2]?.count ?? 0),
        title: "Detractor watch",
        body: `${content.buckets[2]?.count ?? 0} detractor response${content.buckets[2]?.count === 1 ? "" : "s"} in this period.`,
        icon: <InsightClockIcon />,
      },
      {
        tag: "Watch Area",
        tagKind: "watch",
        value: `${responseRate}%`,
        title: "Survey engagement",
        body:
          outreach.surveysSent > 0
            ? `${outreach.responsesReceived} of ${outreach.surveysSent} surveys returned during the period.`
            : "Survey outreach counts will appear once invitation emails are sent.",
        icon: <InsightTrendIcon />,
      },
    ];
  }

  return [
    {
      tag: "Strength",
      tagKind: "strength",
      value: content.scoreDisplay,
      title: content.insightTitle,
      body: content.insightBody,
      icon: <InsightBulbIcon />,
    },
    {
      tag: "Highlight",
      tagKind: "highlight",
      value: String(negativeBucket.count),
      title: "Friction signal",
      body: `${negativeBucket.count} difficult response${negativeBucket.count === 1 ? "" : "s"} on the effort scale in this period.`,
      icon: <InsightClockIcon />,
    },
    {
      tag: "Watch Area",
      tagKind: "watch",
      value: `${responseRate}%`,
      title: "Survey engagement",
      body:
        outreach.surveysSent > 0
          ? `${outreach.responsesReceived} of ${outreach.surveysSent} surveys returned during the period.`
          : "Survey outreach counts will appear once invitation emails are sent.",
      icon: <InsightTrendIcon />,
    },
  ];
}


function parsePercent(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function parseCesAverage(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function InsightBulbIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M11 3C7.686 3 5 5.686 5 9c0 2.21 1.197 4.14 2.983 5.197L8 16h6l.017-1.803A6 6 0 0011 3z"
        stroke="#3f9c35"
        strokeWidth="1.4"
      />
      <path d="M8 18h6M9 20h4" stroke="#3f9c35" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function InsightClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8.5" stroke="#009cde" strokeWidth="1.4" />
      <path d="M11 7v4.5l3 2" stroke="#009cde" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function InsightTrendIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8.5" stroke="#63666a" strokeWidth="1.4" />
      <polyline
        points="7,14 9.5,10 12,12.5 15,8"
        stroke="#63666a"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
