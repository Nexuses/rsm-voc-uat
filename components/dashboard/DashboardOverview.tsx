"use client";

import { useMemo, useState } from "react";
import DownloadAnnualReportButton from "@/components/dashboard/DownloadAnnualReportButton";
import DownloadPartnerReportButton from "@/components/dashboard/DownloadPartnerReportButton";
import DownloadPeriodReportButton from "@/components/dashboard/DownloadPeriodReportButton";
import DashboardReportFilters from "@/components/dashboard/DashboardReportFilters";
import PerformanceIndicators from "@/components/dashboard/PerformanceIndicators";
import { ExperienceTrendChart } from "@/components/dashboard/MetricCharts";
import SmileyIcon, { RiskSignalIcon } from "@/components/dashboard/SmileyIcon";
import type { CxReportNarrative } from "@/lib/ai/cx-report-narrative";
import {
  buildDashboardReport,
  formatThemeLabel,
  type DashboardAnalyticsItem,
} from "@/lib/dashboard-analytics";
import {
  collectInviteFilterOptions,
  emptyDashboardOrgFilters,
  filterDashboardInsights,
  filterInviteRecordsForReporting,
} from "@/lib/dashboard-report-filters";
import styles from "./dashboard.module.css";
import type { DashboardInsight, DashboardWindow } from "./types";
import { useDashboardInsights } from "./useDashboardInsights";
import { buildOutreachStatsForWindow } from "@/lib/survey-outreach-stats";

const MAX_LEADING_THEMES = 7;

function toAnalyticsItem(item: DashboardInsight): DashboardAnalyticsItem & {
  department?: string | null;
  partner?: string | null;
  serviceName?: string | null;
  businessManagerName?: string | null;
  jobManagerName?: string | null;
  customerName?: string | null;
  client?: { company?: string | null; name?: string | null } | null;
} {
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
    department: item.department,
    partner: item.partner,
    serviceName: item.serviceName,
    businessManagerName: item.businessManagerName,
    jobManagerName: item.jobManagerName,
    customerName: item.client?.name?.trim() || null,
    client: item.client,
  };
}

export default function DashboardOverview() {
  const { items, inviteRecords, loading, loadingHint, error, retryInsights } =
    useDashboardInsights();
  const [window, setWindow] = useState<DashboardWindow>("all");
  const [org, setOrg] = useState(emptyDashboardOrgFilters);
  const [annualNarrative, setAnnualNarrative] =
    useState<CxReportNarrative | null>(null);
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

  // Shown when an admin has filtered to one partner, or when the signed-in
  // user's own data is already scoped to exactly one partner (portfolio).
  const effectivePartnerName = useMemo(() => {
    if (org.partner.trim()) return org.partner.trim();
    const distinct = new Set(
      items
        .map((item) => item.partner?.trim())
        .filter((name): name is string => Boolean(name))
    );
    return distinct.size === 1 ? [...distinct][0]! : "";
  }, [items, org.partner]);

  return (
    <>
      <section className={styles.overviewLead} aria-label="CX Intelligence">
        <div className={styles.overviewLeadTitle}>
          <span>Voice of Clients</span>
          <h1>CX Intelligence</h1>
        </div>
        {/* PDF Download = custom-period 4-page CX; Annual PDF = full deck + AI. */}
        <div className={styles.overviewLeadActions}>
          <div className={styles.overviewLeadButtonRow}>
            <DownloadPeriodReportButton
              window={window}
              org={org}
              disabled={loading || Boolean(error)}
            />
            <DownloadAnnualReportButton
              window={window}
              org={org}
              disabled={loading || Boolean(error)}
              onNarrativeChange={setAnnualNarrative}
            />
            {effectivePartnerName ? (
              <DownloadPartnerReportButton
                window={window}
                org={org}
                partnerName={effectivePartnerName}
                disabled={loading || Boolean(error)}
              />
            ) : null}
          </div>
        </div>
        {annualNarrative ? (
          <aside
            className={styles.narrativePreview}
            aria-label="AI narrative preview"
          >
            <div className={styles.narrativePreviewHeader}>
              <div>
                <span className={styles.narrativePreviewEyebrow}>
                  Included in Annual PDF
                </span>
                <h3>Executive summary</h3>
              </div>
            </div>
            <p>{annualNarrative.executiveSummary}</p>
          </aside>
        ) : null}
      </section>
      <DashboardReportFilters
        window={window}
        onWindowChange={setWindow}
        org={org}
        onOrgChange={setOrg}
        options={filterOptions}
      />

      {loading ? (
        <DashboardMessage>
          Loading insights...
          {loadingHint ? (
            <>
              {" "}
              The database may be waking up — this can take up to a minute on
              the first load.
            </>
          ) : null}
        </DashboardMessage>
      ) : null}
      {error ? (
        <DashboardMessage tone="error">
          {error}{" "}
          <button type="button" className={styles.retryButton} onClick={retryInsights}>
            Retry
          </button>
        </DashboardMessage>
      ) : null}

      {!loading && !error ? (
        <>
          <PerformanceIndicators
            report={report}
            responseCount={filteredItems.length}
            outreach={outreach}
          />

          <section className={styles.analyticsGrid}>
            <article className={`${styles.panel} ${styles.trendPanel}`}>
              <PanelHeading
                label="Monthly view"
                title="Experience trend"
                detail="All three metrics shown on their native scales"
              />
              <ExperienceTrendChart rows={report.trend} />
            </article>

            <article className={`${styles.panel} ${styles.sentimentPanel}`}>
              <PanelHeading
                label="AI enrichment"
                title="Sentiment and risk"
                detail={`${report.positivePercent}% positive across enriched responses`}
              />
              <div className={styles.sentimentPanelBody}>
                <div className={styles.sentimentStats}>
                  <div className={styles.sentimentStatPositive}>
                    <div className={styles.sentimentStatBadge} aria-hidden="true">
                      <SmileyIcon
                        tone="positive"
                        bold
                        className={styles.sentimentStatIcon}
                      />
                    </div>
                    <div className={styles.sentimentStatCopy}>
                      <strong>{report.positivePercent}%</strong>
                      <span>Positive</span>
                    </div>
                  </div>
                  <div className={styles.sentimentStatNeutral}>
                    <div className={styles.sentimentStatBadge} aria-hidden="true">
                      <SmileyIcon
                        tone="neutral"
                        bold
                        className={styles.sentimentStatIcon}
                      />
                    </div>
                    <div className={styles.sentimentStatCopy}>
                      <strong>{report.neutralPercent}%</strong>
                      <span>Neutral</span>
                    </div>
                  </div>
                  <div className={styles.sentimentStatNegative}>
                    <div className={styles.sentimentStatBadge} aria-hidden="true">
                      <SmileyIcon
                        tone="negative"
                        bold
                        className={styles.sentimentStatIcon}
                      />
                    </div>
                    <div className={styles.sentimentStatCopy}>
                      <strong>{report.negativePercent}%</strong>
                      <span>Negative</span>
                    </div>
                  </div>
                  <div className={styles.sentimentStatRisk}>
                    <div className={styles.sentimentStatBadge} aria-hidden="true">
                      <RiskSignalIcon bold className={styles.sentimentStatIcon} />
                    </div>
                    <div className={styles.sentimentStatCopy}>
                      <strong>{report.riskCount}</strong>
                      <span>Risk signals</span>
                    </div>
                  </div>
                </div>
                {report.positivePercent +
                  report.neutralPercent +
                  report.negativePercent >
                0 ? (
                  <div className={styles.sentimentMix}>
                    <p className={styles.sentimentMixHeading}>Sentiment mix</p>
                    <div
                      className={styles.sentimentSegmentBar}
                      aria-label={`Positive ${report.positivePercent}%, neutral ${report.neutralPercent}%, negative ${report.negativePercent}%`}
                    >
                      <i style={{ width: `${report.positivePercent}%` }} />
                      <i style={{ width: `${report.neutralPercent}%` }} />
                      <i style={{ width: `${report.negativePercent}%` }} />
                    </div>
                  </div>
                ) : (
                  <p className={styles.sentimentPending}>
                    Sentiment labels appear after GPT enrichment completes.
                  </p>
                )}
                <div className={styles.riskSummary}>
                  <strong>{report.riskCount}</strong>
                  <span>
                    {report.riskCount === 1 ? "response" : "responses"} flagged
                    for follow-up
                    {filteredItems.length
                      ? ` (${Math.round((report.riskCount / filteredItems.length) * 100)}% of period)`
                      : ""}
                  </span>
                </div>
              </div>
            </article>

            <article className={`${styles.panel} ${styles.themePanel}`}>
              <PanelHeading
                label="Client language"
                title="Leading themes"
                detail="Most frequently identified service drivers"
              />
              <div className={styles.themePanelBody}>
                <div className={styles.themeList}>
                  {report.themes.length ? (
                    <>
                      {report.themes.slice(0, MAX_LEADING_THEMES).map(([theme, count]) => (
                        <span key={theme}>
                          {formatThemeLabel(theme)}
                          <strong>{count}</strong>
                        </span>
                      ))}
                      {report.themes.length > MAX_LEADING_THEMES ? (
                        <p className={styles.themeListOverflow}>
                          +{report.themes.length - MAX_LEADING_THEMES} more themes
                          in enriched responses
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p>Theme insight will appear as responses are enriched.</p>
                  )}
                </div>
              </div>
            </article>
          </section>
        </>
      ) : null}
    </>
  );
}

function PanelHeading({
  label,
  title,
  detail,
}: {
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <header className={styles.panelHeading}>
      <span>{label}</span>
      <h2>{title}</h2>
      <p>{detail}</p>
    </header>
  );
}

function DashboardMessage({
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
