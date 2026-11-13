"use client";

import { CesGaugeChart, ShareDonutChart } from "@/components/dashboard/MetricCharts";
import { ScaleToneIcon } from "@/components/dashboard/MetricIcons";
import type { DashboardReport } from "@/lib/dashboard-analytics";
import type { MetricReportContent } from "@/lib/metric-report-content";
import {
  METRIC_IDENTITY_COLORS,
  methodologyScaleBarSegments,
  type SmileyTone,
} from "@/lib/rating-visuals";
import styles from "./dashboard.module.css";

type MetricMethodologyCardProps = {
  content: MetricReportContent;
  report: DashboardReport;
  positiveCount: number;
  total: number;
};

const NPS_SCALE_BAR = methodologyScaleBarSegments("nps");
const CES_SCALE_BAR = methodologyScaleBarSegments("ces");

export default function MetricMethodologyCard({
  content,
  report,
  positiveCount,
  total,
}: MetricMethodologyCardProps) {
  if (content.kind === "nps") {
    return (
      <NpsMethodologyCard content={content} report={report} total={total} />
    );
  }

  if (content.kind === "ces") {
    return (
      <CesMethodologyCard content={content} report={report} total={total} />
    );
  }

  return (
    <CsatMethodologyCard
      content={content}
      positiveCount={positiveCount}
      total={total}
    />
  );
}

function CsatMethodologyCard({
  content,
  positiveCount,
  total,
}: {
  content: MetricReportContent;
  positiveCount: number;
  total: number;
}) {
  const scorePercent = parsePercent(content.scoreDisplay);
  const rating5 = content.buckets[0].count;
  const rating4 = content.buckets[1].count;

  return (
    <article className={styles.metricReportCard} aria-label="Methodology and calculation">
      <header className={styles.metricReportCardHead}>
        <h2 className={styles.metricReportCardTitle}>Methodology &amp; calculation</h2>
        <p className={styles.metricReportCardSub}>
          A 5-point scale — ratings of 4 (Satisfied) and 5 (Very Satisfied) are counted as
          positive.
        </p>
      </header>

      <div className={styles.metricReportCardBody}>
        <div className={styles.metricReportMethodologyContent}>
          <span className={styles.metricReportMethodLink}>RSM in Kuwait &amp; Global CSAT Scale</span>

          <div className={styles.metricReportScaleIcons}>
            {content.scaleCells.map((cell) => (
              <div key={cell.rating} className={styles.metricReportScaleIconCell}>
                <ScaleToneIcon tone={cell.tone as SmileyTone} className={styles.metricReportScaleIcon} />
                <span data-tone={cell.tone}>
                  {cell.label}
                  <br />
                  ({cell.rating})
                </span>
              </div>
            ))}
          </div>

          <div className={styles.metricReportMethodBar} aria-hidden="true">
            <span data-rating="5">5</span>
            <span data-rating="4">4</span>
            <span data-rating="3">3</span>
            <span data-rating="2">2</span>
            <span data-rating="1">1</span>
          </div>

          <div className={styles.metricReportCalc}>
            <span className={styles.metricReportCalcPill}>Total Positive (4+5)</span>

            {total > 0 ? (
              <>
                <div className={styles.metricReportCalcFormula}>
                  <span aria-hidden="true">÷</span>
                  <strong>Total Responses</strong>
                  <span className={styles.metricReportCalcMuted}>
                    {rating5} + {rating4} =
                  </span>
                  <span className={styles.metricReportCalcHighlight}>{positiveCount}</span>
                  <span className={styles.metricReportCalcMuted}>
                    ÷ {total} = {(positiveCount / total).toFixed(2)} × 100
                  </span>
                  <div className={styles.metricReportCalcResult}>
                    {scorePercent}%
                    <small>CSAT</small>
                  </div>
                </div>
                <div className={styles.metricReportCalcFormula}>
                  <span aria-hidden="true">=</span>
                  <span className={styles.metricReportCalcCsatPill}>CSAT %</span>
                </div>
              </>
            ) : (
              <p className={styles.metricReportCalcNote}>{content.scaleFormula}</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function NpsMethodologyCard({
  content,
  report,
  total,
}: {
  content: MetricReportContent;
  report: DashboardReport;
  total: number;
}) {
  const { nps } = report;
  const promoters = nps.promoters;
  const detractors = nps.detractors;
  const promoterPct = total > 0 ? (promoters / total) * 100 : 0;
  const detractorPct = total > 0 ? (detractors / total) * 100 : 0;
  const npsScore = nps.score === null ? null : Math.round(nps.score);
  const donutPercent =
    npsScore === null ? 0 : Math.max(0, Math.min(100, npsScore));

  return (
    <article className={styles.metricReportCard} aria-label="Methodology and calculation">
      <header className={styles.metricReportCardHead}>
        <h2 className={styles.metricReportCardTitle}>Methodology &amp; calculation</h2>
        <p className={styles.metricReportCardSub}>
          NPS = % Promoters (rating 9–10) minus % Detractors (ratings 0–6).
        </p>
      </header>

      <div className={styles.metricReportCardBody}>
        <div className={styles.metricReportMethodologyContent}>
          <span className={styles.metricReportMethodLink}>Global NPS Scale</span>

          <div className={styles.metricReportMethodPanel}>
            <p className={styles.metricReportMethodPanelTitle}>Global NPS Scale (0–10)</p>
            <div className={styles.metricReportMethodIconsNps}>
              {content.scaleCells.map((cell) => (
                <div
                  key={cell.rating}
                  className={styles.metricReportScaleIconCell}
                  data-segment={cell.tone}
                >
                  <ScaleToneIcon tone={cell.tone as SmileyTone} className={styles.metricReportScaleIcon} />
                  <span data-tone={cell.tone}>
                    {cell.label}
                    <br />
                    ({cell.rating})
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.metricReportMethodBarCompact} aria-hidden="true">
              {NPS_SCALE_BAR.map((segment) => (
                <span key={segment.rating} style={{ background: segment.color }}>
                  {segment.rating}
                </span>
              ))}
            </div>
          </div>

          {total > 0 && npsScore !== null ? (
            <div className={styles.metricReportCalcRowWrap}>
              <div className={styles.metricReportCalcMain}>
                <div className={styles.metricReportFormulaStrip}>
                  <div>
                    %
                    <br />
                    Promoters
                  </div>
                  <span aria-hidden="true">−</span>
                  <div>
                    %
                    <br />
                    Detractors
                  </div>
                  <span aria-hidden="true">=</span>
                  <div className={styles.metricReportFormulaResult}>Overall NPS</div>
                </div>
                <div className={styles.metricReportNumberStrip}>
                  <div>
                    <strong>{promoterPct.toFixed(1)}%</strong>
                    <small>
                      ({promoters}÷{total})×100
                    </small>
                  </div>
                  <span aria-hidden="true">−</span>
                  <div>
                    <strong>{detractorPct.toFixed(1)}%</strong>
                    <small>
                      ({detractors}÷{total})×100
                    </small>
                  </div>
                  <span aria-hidden="true">=</span>
                  <strong className={styles.metricReportNumberFinal}>{npsScore}%</strong>
                </div>
              </div>
              <span className={styles.metricReportCalcEqualsCol} aria-hidden="true">
                =
              </span>
              <div className={styles.metricReportMethodResultCol}>
                <ShareDonutChart
                  percent={donutPercent}
                  label="NPS"
                  color={METRIC_IDENTITY_COLORS.nps}
                  variant="method"
                />
                <p className={styles.metricReportMethodResultCaption}>
                  Net Promoter Score
                  <br />
                  (NPS) Period result
                </p>
              </div>
            </div>
          ) : (
            <p className={styles.metricReportCalcNote}>{content.scaleFormula}</p>
          )}
        </div>
      </div>
    </article>
  );
}

function CesMethodologyCard({
  content,
  report,
  total,
}: {
  content: MetricReportContent;
  report: DashboardReport;
  total: number;
}) {
  const { ces } = report;
  const scoreSum = ces.distribution.reduce(
    (sum, count, index) => sum + count * (index + 1),
    0
  );
  const average = ces.average;

  return (
    <article className={styles.metricReportCard} aria-label="Methodology and calculation">
      <header className={styles.metricReportCardHead}>
        <h2 className={styles.metricReportCardTitle}>Methodology &amp; calculation</h2>
        <p className={styles.metricReportCardSub}>
          Average score — ratings on the 1–7 effort scale (Very Difficult to Very Easy).
        </p>
      </header>

      <div className={styles.metricReportCardBody}>
        <div className={styles.metricReportMethodologyContent}>
          <span className={styles.metricReportMethodLink}>Global CES Scale</span>

          <div className={styles.metricReportMethodPanel}>
            <p className={styles.metricReportMethodPanelTitle}>Global CES Scale (1–7)</p>
            <div className={styles.metricReportMethodIconsCes}>
              {content.scaleCells.map((cell) => (
                <div key={cell.rating} className={styles.metricReportScaleIconCell}>
                  <ScaleToneIcon tone={cell.tone as SmileyTone} className={styles.metricReportScaleIcon} />
                  <span data-tone={cell.tone}>
                    {cell.label}
                    <br />
                    ({cell.rating})
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.metricReportMethodBarCompact} aria-hidden="true">
              {CES_SCALE_BAR.map((segment) => (
                <span key={segment.rating} style={{ background: segment.color }}>
                  {segment.rating}
                </span>
              ))}
            </div>
          </div>

          {total > 0 && average !== null ? (
            <div className={styles.metricReportCalcRowWrap}>
              <div className={styles.metricReportCalcMain}>
                <div className={styles.metricReportFormulaStrip}>
                  <div>
                    Sum of all
                    <br />
                    response scores
                  </div>
                  <span aria-hidden="true">÷</span>
                  <div>
                    Total number
                    <br />
                    of responses
                  </div>
                  <span aria-hidden="true">=</span>
                  <div className={styles.metricReportFormulaResult}>Overall CES</div>
                </div>
                <div className={styles.metricReportNumberStrip}>
                  <strong className={styles.metricReportNumberValueAccent}>{scoreSum}</strong>
                  <span aria-hidden="true">÷</span>
                  <strong className={styles.metricReportNumberValue}>{total}</strong>
                  <span aria-hidden="true">=</span>
                  <strong className={styles.metricReportNumberFinalGreen}>
                    {average.toFixed(1)}
                  </strong>
                </div>
              </div>
              <span className={styles.metricReportCalcEqualsCol} aria-hidden="true">
                =
              </span>
              <div className={styles.metricReportMethodResultCol}>
                <CesGaugeChart value={average} min={1} max={7} variant="method" />
                <p className={styles.metricReportMethodResultScore}>
                  {average.toFixed(1)} CES
                </p>
                <p className={styles.metricReportMethodResultCaption}>
                  Customer Effort Score
                  <br />
                  (CES) Period result
                </p>
              </div>
            </div>
          ) : (
            <p className={styles.metricReportCalcNote}>{content.scaleFormula}</p>
          )}
        </div>
      </div>
    </article>
  );
}

function parsePercent(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}
