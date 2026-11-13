"use client";

import { useEffect, useMemo, useState } from "react";
import RsmLogo from "@/components/RsmLogo";
import {
  metricScaleColor,
  NPS_SEGMENT_COLORS,
} from "@/lib/rating-visuals";
import styles from "./reports.module.css";
import { formatPeriodLabel } from "@/lib/period-label";

type MetricBlock = {
  score: number | null;
  favorablePercent?: number;
  promoterPercent?: number;
  passivePercent?: number;
  detractorPercent?: number;
  responseCount: number;
  distribution: Record<string, number>;
};

type PublicMetrics = {
  period: string;
  latestPeriod: string | null;
  totalResponses: number;
  csat: MetricBlock & { scale: { min: number; max: number } };
  ces: MetricBlock & { scale: { min: number; max: number } };
  nps: MetricBlock;
  trend: Array<{
    period: string;
    csat: { score: number | null; favorablePercent: number; responseCount: number };
    ces: { score: number | null; favorablePercent: number; responseCount: number };
    nps: {
      score: number | null;
      promoterPercent: number;
      passivePercent: number;
      detractorPercent: number;
      responseCount: number;
    };
  }>;
  themes: Array<{
    label: string;
    sentiment: string;
    mentions: number;
    summary: string;
  }>;
};

export default function PublicVocReport() {
  const [data, setData] = useState<PublicMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/metrics", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load public metrics.");
        return response.json() as Promise<PublicMetrics>;
      })
      .then(setData)
      .catch((fetchError: unknown) => {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }
        setError("Client experience metrics are temporarily unavailable.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const trendRows = useMemo(
    () =>
      (data?.trend ?? []).map((row) => ({
        period: row.period,
        label: formatPeriodLabel(row.period),
        csat: row.csat.score,
        ces: row.ces.score,
        nps: row.nps.score,
      })),
    [data?.trend]
  );

  const csatDistribution = useMemo(
    () => distributionFromRecord(data?.csat.distribution, 1, 5),
    [data?.csat.distribution]
  );
  const cesDistribution = useMemo(
    () => distributionFromRecord(data?.ces.distribution, 1, 7),
    [data?.ces.distribution]
  );
  const npsDistribution = useMemo(
    () => distributionFromRecord(data?.nps.distribution, 0, 10),
    [data?.nps.distribution]
  );

  return (
    <div className={styles.report}>
      <aside className={styles.sidebar} aria-label="Report branding">
        <div className={styles.brand}>
          <RsmLogo className={styles.brandLogo} priority />
          <span>
            <small>RSM in Kuwait</small>
            <strong>Voice of Clients</strong>
          </span>
        </div>
        <div className={styles.sidebarMeta}>
          <em>Public experience report</em>
          <span>
            {data?.latestPeriod
              ? `Through ${formatPeriodLabel(data.latestPeriod)}`
              : "All-time results"}
          </span>
        </div>
      </aside>

      <main className={styles.workspace}>
        <div className={styles.intro}>
          <span>Client experience</span>
          <h1>Feedback statistics</h1>
          <p>
            Aggregate satisfaction, effort, and recommendation scores from the
            RSM in Kuwait client survey. Results are anonymized and updated as
            new feedback is received.
          </p>
        </div>

        {loading ? (
          <ReportMessage>Loading client experience metrics...</ReportMessage>
        ) : null}
        {error ? <ReportMessage tone="error">{error}</ReportMessage> : null}

        {!loading && !error && data ? (
          <>
            <section className={styles.metrics} aria-label="Experience metrics">
              <MetricCard
                label="CSAT"
                value={formatMetric(data.csat.score, 5)}
                detail={`${formatPercent(data.csat.favorablePercent)} favorable · ${data.csat.responseCount} ratings`}
                accent="green"
              />
              <MetricCard
                label="CES"
                value={formatMetric(data.ces.score, 7)}
                detail={`${formatPercent(data.ces.favorablePercent)} favorable · ${data.ces.responseCount} ratings`}
                accent="grey"
              />
              <MetricCard
                label="NPS"
                value={formatNumber(data.nps.score)}
                detail={`${formatPercent(data.nps.promoterPercent)} promoters · ${data.nps.responseCount} ratings`}
                accent="blue"
              />
              <MetricCard
                label="Responses"
                value={String(data.totalResponses)}
                detail="Completed survey submissions"
                accent="slate"
              />
            </section>

            <section className={styles.analyticsGrid} aria-label="Trends and distributions">
              <article className={styles.panel}>
                <PanelHeading
                  label="Monthly view"
                  title="Experience trend"
                  detail="CSAT, CES, and NPS shown on their native scales"
                />
                <TrendChart rows={trendRows} />
              </article>

              <article className={styles.panel}>
                <PanelHeading
                  label="Recommendation"
                  title="NPS mix"
                  detail="Promoters 9–10 · Neutral 7–8 · Detractors 0–6"
                />
                <div className={styles.npsScore}>
                  <strong>{formatNumber(data.nps.score)}</strong>
                  <span>Net Promoter Score</span>
                </div>
                <div
                  className={styles.segmentBar}
                  aria-label="NPS promoter, neutral, and detractor mix"
                >
                  <i
                    style={{
                      width: `${data.nps.promoterPercent ?? 0}%`,
                      background: NPS_SEGMENT_COLORS.promoters,
                    }}
                  />
                  <i
                    style={{
                      width: `${data.nps.passivePercent ?? 0}%`,
                      background: NPS_SEGMENT_COLORS.neutral,
                    }}
                  />
                  <i
                    style={{
                      width: `${data.nps.detractorPercent ?? 0}%`,
                      background: NPS_SEGMENT_COLORS.detractors,
                    }}
                  />
                </div>
                <div className={styles.segmentLegend}>
                  <span>
                    <i style={{ background: NPS_SEGMENT_COLORS.promoters }} />
                    Promoters{" "}
                    <strong>{formatPercent(data.nps.promoterPercent)}</strong>
                  </span>
                  <span>
                    <i style={{ background: NPS_SEGMENT_COLORS.neutral }} />
                    Neutral{" "}
                    <strong>{formatPercent(data.nps.passivePercent)}</strong>
                  </span>
                  <span>
                    <i style={{ background: NPS_SEGMENT_COLORS.detractors }} />
                    Detractors{" "}
                    <strong>{formatPercent(data.nps.detractorPercent)}</strong>
                  </span>
                </div>
              </article>

              <DistributionPanel
                title="CSAT distribution"
                detail="Overall service quality · 1 to 5"
                metric="csat"
                min={1}
                distribution={csatDistribution}
              />
              <DistributionPanel
                title="CES distribution"
                detail="Ease of service and support · 1 to 7"
                metric="ces"
                min={1}
                distribution={cesDistribution}
              />
              <DistributionPanel
                title="NPS distribution"
                detail="Likelihood to recommend · 0 to 10"
                metric="nps"
                min={0}
                distribution={npsDistribution}
              />
            </section>

            <section className={styles.themeSection} aria-label="Client themes">
              <article className={styles.panel}>
                <PanelHeading
                  label="Client language"
                  title="What clients talk about"
                  detail="AI-summarized themes with identifying details removed"
                />
                {data.themes.length ? (
                  <div className={styles.themeGrid}>
                    {data.themes.map((theme) => (
                      <article key={theme.label} className={styles.themeCard}>
                        <header>
                          <h3>{theme.label}</h3>
                          <em data-sentiment={theme.sentiment}>
                            {theme.sentiment}
                          </em>
                        </header>
                        <p>{theme.summary}</p>
                        <footer>{theme.mentions} mentions</footer>
                      </article>
                    ))}
                  </div>
                ) : (
                  <ReportMessage>
                    Theme summaries will appear as more feedback is collected.
                  </ReportMessage>
                )}
              </article>
            </section>

            <section className={styles.methodology} aria-label="Methodology">
              <h2>How these numbers are calculated</h2>
              <ul>
                <li>
                  CSAT measures overall service satisfaction on a 1–5 scale.
                  Favorable responses are ratings of 4 or 5.
                </li>
                <li>
                  CES measures how easy it was to get service and support on a
                  1–7 scale. Favorable responses are ratings of 5, 6, or 7.
                </li>
                <li>
                  NPS measures likelihood to recommend on a 0–10 scale. The
                  score is promoter percentage minus detractor percentage.
                </li>
                <li>
                  Monthly trends group completed surveys by submission month.
                  This page shows aggregate results only and never displays
                  names, companies, or individual comments.
                </li>
              </ul>
            </section>

            <div className={styles.actions}>
              <p>
                Share your experience to help RSM in Kuwait improve service
                quality.
              </p>
              <a className={styles.surveyLink} href="/survey">
                Take the client survey
              </a>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent: "blue" | "green" | "navy" | "slate" | "grey";
}) {
  return (
    <article className={styles.metric} data-accent={accent}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
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

function TrendChart({
  rows,
}: {
  rows: Array<{
    period: string;
    label: string;
    csat: number | null;
    ces: number | null;
    nps: number | null;
  }>;
}) {
  if (!rows.length) {
    return (
      <p className={styles.trendEmpty}>
        Monthly trends appear after responses are received.
      </p>
    );
  }

  const latest = rows[rows.length - 1];

  return (
    <div className={styles.trendChart}>
      <div className={styles.trendMonths}>
        {rows.map((row) => (
          <div key={row.period} className={styles.trendMonth}>
            <div
              className={styles.trendBars}
              role="img"
              aria-label={`${row.label} experience trend`}
            >
              <span
                className={styles.trendBarCsat}
                style={{ height: `${barHeight(row.csat, 5)}%` }}
              />
              <span
                className={styles.trendBarCes}
                style={{ height: `${barHeight(row.ces, 7)}%` }}
              />
              <span
                className={styles.trendBarNps}
                style={{ height: `${npsBarHeight(row.nps)}%` }}
              />
            </div>
            <strong>{row.label}</strong>
          </div>
        ))}
      </div>
      <div className={styles.trendLegend}>
        <span>
          <i className={styles.legendCsat} />
          CSAT {formatMetric(latest.csat, 5)}
        </span>
        <span>
          <i className={styles.legendCes} />
          CES {formatMetric(latest.ces, 7)}
        </span>
        <span>
          <i className={styles.legendNps} />
          NPS {formatNumber(latest.nps)}
        </span>
      </div>
    </div>
  );
}

function DistributionPanel({
  title,
  detail,
  metric,
  min,
  distribution,
}: {
  title: string;
  detail: string;
  metric: "csat" | "ces" | "nps";
  min: number;
  distribution: number[];
}) {
  const max = Math.max(...distribution, 0);

  return (
    <article className={styles.panel}>
      <PanelHeading label="Rating detail" title={title} detail={detail} />
      <div className={styles.ratingChart}>
        {distribution.map((count, index) => {
          const rating = index + min;
          return (
            <div key={rating}>
              <span>{rating}</span>
              <i>
                <b
                  style={{
                    width: `${max ? (count / max) * 100 : 0}%`,
                    background: metricScaleColor(metric, rating),
                  }}
                />
              </i>
              <strong>{count}</strong>
            </div>
          );
        })}
      </div>
    </article>
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

function distributionFromRecord(
  distribution: Record<string, number> | undefined,
  min: number,
  max: number
) {
  const values: number[] = [];
  for (let rating = min; rating <= max; rating += 1) {
    values.push(distribution?.[String(rating)] ?? 0);
  }
  return values;
}

function barHeight(value: number | null, max: number) {
  if (value === null || max <= 0) return 8;
  return Math.max(12, Math.round((value / max) * 100));
}

function npsBarHeight(value: number | null) {
  if (value === null) return 8;
  return Math.max(12, Math.round(((value + 100) / 200) * 100));
}

function formatMetric(value: number | null, max: number) {
  return value === null ? "—" : `${value.toFixed(1)}/${max}`;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}
