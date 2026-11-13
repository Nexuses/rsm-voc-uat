import type { DashboardInsight } from "@/components/dashboard/types";
import {
  buildDashboardReport,
  type DashboardAnalyticsItem,
} from "@/lib/dashboard-analytics";
import {
  DASHBOARD_INSIGHTS_EXPORT_LIMIT,
  dashboardInsightsToCsv,
  dashboardInsightsToExcel,
} from "@/lib/dashboard-responses-export";
import { cxResponseInsightsSelect } from "@/lib/cx-response-select";
import { mapCxResponseToDashboardInsight } from "@/lib/cx-insights-map";
import { db } from "@/lib/db";
import { sendSurveyInviteEmailToRecipients } from "@/lib/survey-invite-email";
import { getTeamNotifyRecipients } from "@/lib/survey-thankyou-email";

export const SCHEDULED_REPORT_CADENCES = [
  "weekly",
  "monthly",
  "quarterly",
] as const;

export type ScheduledReportCadence =
  (typeof SCHEDULED_REPORT_CADENCES)[number];

export function isScheduledReportCadence(
  value: string
): value is ScheduledReportCadence {
  return (SCHEDULED_REPORT_CADENCES as readonly string[]).includes(value);
}

export function submittedInReportCadence(
  submittedAt: string,
  cadence: ScheduledReportCadence,
  now = new Date()
) {
  const date = new Date(submittedAt);
  if (Number.isNaN(date.getTime())) return false;

  if (cadence === "weekly") {
    return date.getTime() >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
  }

  if (cadence === "monthly") {
    return (
      date.getUTCFullYear() === now.getUTCFullYear() &&
      date.getUTCMonth() === now.getUTCMonth()
    );
  }

  const nowQuarter = Math.floor(now.getUTCMonth() / 3);
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    Math.floor(date.getUTCMonth() / 3) === nowQuarter
  );
}

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

function formatScore(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

export async function processScheduledCxReport(
  cadence: ScheduledReportCadence,
  now = new Date()
) {
  const recipients = getTeamNotifyRecipients();
  if (!recipients.length) {
    return {
      sent: false,
      skipped: "no_recipients" as const,
      cadence,
      responseCount: 0,
    };
  }

  const responses = await db.response.findMany({
    where: { excludedAt: null },
    orderBy: { createdAt: "desc" },
    select: cxResponseInsightsSelect,
    take: DASHBOARD_INSIGHTS_EXPORT_LIMIT,
  });

  const items = responses
    .map(mapCxResponseToDashboardInsight)
    .filter((item) => submittedInReportCadence(item.submittedAt, cadence, now));

  const report = buildDashboardReport(items.map(toAnalyticsItem));
  const stamp = now.toISOString().slice(0, 10);
  const csv = dashboardInsightsToCsv(items);
  const excel = dashboardInsightsToExcel(items);

  const periodLabel =
    cadence === "weekly"
      ? "the last 7 days"
      : cadence === "monthly"
        ? "the current calendar month (UTC)"
        : "the current calendar quarter (UTC)";

  const subject = `RSM Voice of Clients ${cadence} report — ${stamp}`;
  const text = [
    `CX ${cadence} report for ${periodLabel}.`,
    `Responses in window: ${items.length} (latest ${DASHBOARD_INSIGHTS_EXPORT_LIMIT} responses scanned).`,
    `CSAT avg: ${formatScore(report.csat.average)}`,
    `CES avg: ${formatScore(report.ces.average)}`,
    `NPS: ${formatScore(report.nps.score)}`,
    "CSV and Excel attachments use the same columns as /dashboard/responses export.",
  ].join("\n");

  const html = `<p>CX <strong>${cadence}</strong> report for ${periodLabel}.</p>
<p>Responses in window: <strong>${items.length}</strong> (latest ${DASHBOARD_INSIGHTS_EXPORT_LIMIT} responses scanned).</p>
<ul>
<li>CSAT avg: ${formatScore(report.csat.average)}</li>
<li>CES avg: ${formatScore(report.ces.average)}</li>
<li>NPS: ${formatScore(report.nps.score)}</li>
</ul>
<p>CSV and Excel attachments match the filtered responses export. This mail is internal CX only.</p>`;

  await sendSurveyInviteEmailToRecipients({
    to: recipients,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `voc-responses-${cadence}-${stamp}.csv`,
        type: "text/csv",
        content: Buffer.from(csv, "utf8").toString("base64"),
      },
      {
        filename: `voc-responses-${cadence}-${stamp}.xls`,
        type: "application/vnd.ms-excel",
        content: Buffer.from(excel, "utf8").toString("base64"),
      },
    ],
  });

  return {
    sent: true,
    skipped: null,
    cadence,
    responseCount: items.length,
  };
}
