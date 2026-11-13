"use client";

import { useMemo, useState, type CSSProperties } from "react";
import DashboardReportFilters from "@/components/dashboard/DashboardReportFilters";
import DownloadMetricReportButton from "@/components/dashboard/DownloadMetricReportButton";
import {
  buildDashboardReport,
  type DashboardAnalyticsItem,
} from "@/lib/dashboard-analytics";
import {
  buildMetricReportContent,
  extractMetricQuotes,
  type MetricKind,
} from "@/lib/metric-report-content";
import {
  collectInviteFilterOptions,
  emptyDashboardOrgFilters,
  filterDashboardInsights,
  filterInviteRecordsForReporting,
} from "@/lib/dashboard-report-filters";
import {
  MetricKindIcon,
  RatingToneIcon,
  SectionIcon,
} from "@/components/dashboard/MetricIcons";
import MetricReportAnalytics from "@/components/dashboard/MetricReportAnalytics";
import SurveyParticipationStats from "@/components/dashboard/SurveyParticipationStats";
import type { DashboardInsight, DashboardWindow } from "@/components/dashboard/types";
import { useDashboardInsights } from "@/components/dashboard/useDashboardInsights";
import { buildOutreachStatsForWindow } from "@/lib/survey-outreach-stats";
import styles from "./dashboard.module.css";

type MetricReportViewProps = {
  metric: MetricKind;
};

function toAnalyticsItem(item: DashboardInsight): DashboardAnalyticsItem {
  return {
    responseId: item.responseId,
    submittedAt: item.submittedAt,
    company: item.client?.company?.trim() || null,
    clientName: item.client?.name?.trim() || null,
    source: item.source,
    sentiment: item.sentiment,
    metrics: item.metrics,
    keyDrivers: item.keyDrivers,
    riskSignals: item.riskSignals,
    answers: item.answers.map((answer) => ({
      questionNumber: answer.questionNumber,
      metric: answer.metric,
      rating: answer.rating,
    })),
  };
}

export default function MetricReportView({ metric }: MetricReportViewProps) {
  const { items, inviteRecords, loading, loadingHint, error, retryInsights } =
    useDashboardInsights();
  const [window, setWindow] = useState<DashboardWindow>("all");
  const [org, setOrg] = useState(emptyDashboardOrgFilters);
  const filterOptions = useMemo(
    () => collectInviteFilterOptions([...inviteRecords, ...items]),
    [inviteRecords, items]
  );

  const filteredItems = useMemo(
    () => filterDashboardInsights(items, window, org),
    [items, window, org]
  );
  const report = useMemo(
    () => buildDashboardReport(filteredItems.map(toAnalyticsItem)),
    [filteredItems]
  );
  const outreach = useMemo(
    () =>
      buildOutreachStatsForWindow(
        filterInviteRecordsForReporting(inviteRecords, window, org),
        window
      ),
    [inviteRecords, window, org]
  );
  const content = useMemo(
    () => buildMetricReportContent(metric, report, filteredItems.length),
    [metric, report, filteredItems.length]
  );
  const quotes = useMemo(
    () => extractMetricQuotes(filteredItems, metric),
    [filteredItems, metric]
  );

  return (
    <>
      <header className={styles.metricReportHeader}>
        <div className={styles.metricReportHeaderMain}>
          <div className={styles.metricReportHeaderCopy}>
            <span className={styles.metricReportKicker}>Voice of Clients</span>
            <h1 className={styles.metricReportPageTitle}>
              <MetricKindIcon
                kind={metric}
                className={styles.metricReportPageTitleIcon}
              />
              <span>{content.title}</span>
            </h1>
          </div>
          <DownloadMetricReportButton
            metric={metric}
            window={window}
            org={org}
            disabled={loading || Boolean(error)}
          />
        </div>
      </header>
      <DashboardReportFilters
        window={window}
        onWindowChange={setWindow}
        org={org}
        onOrgChange={setOrg}
        options={filterOptions}
      />

      {loading ? (
        <ReportMessage>
          Loading report...
          {loadingHint ? (
            <>
              {" "}
              The database may be waking up — this can take up to a minute on the
              first load.
            </>
          ) : null}
        </ReportMessage>
      ) : null}
      {error ? (
        <ReportMessage tone="error">
          {error}{" "}
          <button type="button" className={styles.retryButton} onClick={retryInsights}>
            Retry
          </button>
        </ReportMessage>
      ) : null}

      {!loading && !error ? (
        <div className={styles.metricReport}>
          <SurveyParticipationStats outreach={outreach} />

          <section
            className={styles.metricReportQuestion}
            style={{ "--metric-accent": content.accent } as CSSProperties}
            aria-label="Survey question"
          >
            <p className={styles.metricReportQuestionLabel}>Survey question</p>
            <p className={styles.metricReportQuestionText}>{content.surveyQuestion}</p>
          </section>

          <MetricReportAnalytics
            metric={metric}
            content={content}
            outreach={outreach}
            report={report}
            items={filteredItems}
          />

          <section className={styles.metricReportSection}>
            <p className={styles.metricReportSectionLabel}>
              <SectionIcon section="voices" className={styles.metricReportSectionIcon} />
              Client voices
            </p>
            {quotes.length ? (
              <div className={styles.metricQuoteGrid}>
                {quotes.map((quote) => (
                  <blockquote key={quote.responseId}>
                    <RatingToneIcon
                      rating={quote.rating}
                      className={styles.metricQuoteIcon}
                    />
                    <p>{quote.text}</p>
                    <footer>— {quote.company}</footer>
                  </blockquote>
                ))}
              </div>
            ) : (
              <p className={styles.metricReportEmpty}>
                Client comments for this metric will appear here once enriched
                responses include written feedback.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}

function ReportMessage({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "error";
}) {
  return (
    <p className={styles.message} data-tone={tone}>
      {children}
    </p>
  );
}
