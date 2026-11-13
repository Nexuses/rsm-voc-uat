import type { jsPDF } from "jspdf";
import {
  ANNUAL_CX_COVER_SUBTITLE,
  ANNUAL_CX_COVER_TITLE,
  ANNUAL_CX_METRIC_LABELS,
  ANNUAL_CX_TAGLINE,
  CONTACT_BLOCK,
  FOOTER_LEFT_LINE,
  FOOTER_LEGAL_NAME,
  FROM_INSIGHT_TO_ACTION,
  GOVERNANCE_BLOCKS,
  HOW_WE_LISTEN_STEPS,
  IMPROVEMENT_THEMES,
  LEGAL_NETWORK_TEXT,
  LISTENING_PROGRAMME_PRACTICES,
  buildOutlookBodies,
  conclusionCopy,
  headerPeriodLine,
  methodologyCesFootnote,
  methodologyNpsFootnote,
  performanceAgainstTargetCopy,
  philosophyCopy,
  quotesSectionIntro,
  surveyQuestionCards,
  volumeNarrative,
} from "@/lib/annual-cx-report-copy";
import {
  ANNUAL_CX_TARGETS,
  formatDeltaLabel,
  type AnnualCxComparison,
  type AnnualCxPeriodPlan,
} from "@/lib/annual-cx-report-period";
import type { DashboardReport } from "@/lib/dashboard-analytics";
import { RSM_WHITE_LOGO_URL } from "@/lib/brand";
import { PDF_PAGE, PDF_THEME, type PdfRgb } from "@/lib/pdf-theme";
import type { SurveyOutreachStats } from "@/lib/survey-outreach";
import type { CxReportNarrative } from "@/lib/ai/cx-report-narrative";
import type { AnnualCxQuote } from "@/lib/testimonials/quotes";

const PAGE = PDF_PAGE;
const THEME = PDF_THEME;
const PAGE_TOTAL_PLACEHOLDER = "{nb}";
const PDF_COVER_PAGE_URL = "/pdf/pdf-cover-page.png";

/** Minimum type size in the report: 9pt, the print equivalent of 12px. */
const MIN_FONT = 9;

type LoadedImage = {
  dataUrl: string;
  width: number;
  height: number;
};

export type AnnualCxReportPdfInput = {
  plan: AnnualCxPeriodPlan;
  currentReport: DashboardReport;
  priorReport: DashboardReport;
  currentOutreach: SurveyOutreachStats;
  priorOutreach: SurveyOutreachStats;
  comparison: AnnualCxComparison;
  responseCount: number;
  quotes: AnnualCxQuote[];
  logoUrl?: string;
  /** When set, replaces templated summary/outlook copy with AI draft. */
  aiNarrative?: CxReportNarrative | null;
};

export function annualCxReportFilename(
  plan: AnnualCxPeriodPlan,
  date = new Date()
) {
  const stamp = date.toISOString().slice(0, 10);
  return `rsm-cx-annual-report-${plan.filenamePeriod}-${stamp}.pdf`;
}

export async function downloadAnnualCxReportPdf(options: AnnualCxReportPdfInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const [logo, coverImage] = await Promise.all([
    loadImage(options.logoUrl ?? encodeURI(RSM_WHITE_LOGO_URL)),
    loadImage(resolvePdfAssetUrl(PDF_COVER_PAGE_URL), { cropTransparent: false }),
  ]);
  renderAnnualCxReportPdf(doc, {
    ...options,
    logo,
    coverImage,
    generatedAt: new Date(),
  });
  doc.save(annualCxReportFilename(options.plan));
}

export function renderAnnualCxReportPdf(
  doc: jsPDF,
  options: AnnualCxReportPdfInput & {
    logo: LoadedImage | null;
    coverImage?: LoadedImage | null;
    generatedAt: Date;
  }
) {
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const ctx = { ...options, coverImage: options.coverImage ?? null, contentWidth };

  renderCoverPage(doc, ctx);
  doc.addPage();
  renderPhilosophyPage(doc, ctx);
  doc.addPage();
  renderKpiDashboardPage(doc, ctx);
  doc.addPage();
  renderListeningProgrammePage(doc, ctx);
  doc.addPage();
  renderMetricsDeepDivePage(doc, ctx);
  doc.addPage();
  renderSummaryOutlookPage(doc, ctx);
  doc.addPage();
  renderPerformanceTargetsPage(doc, ctx);
  doc.addPage();
  renderQuotesPage(doc, ctx, 0);
  doc.addPage();
  renderQuotesPage(doc, ctx, 3);
  doc.addPage();
  renderImprovePage(doc, ctx);
  doc.addPage();
  renderConclusionPage(doc, ctx);
  doc.addPage();
  renderBackPage(doc, ctx);

  if (typeof doc.putTotalPages === "function") {
    doc.putTotalPages(PAGE_TOTAL_PLACEHOLDER);
  }
}

type RenderCtx = AnnualCxReportPdfInput & {
  logo: LoadedImage | null;
  coverImage: LoadedImage | null;
  generatedAt: Date;
  contentWidth: number;
};

/** Display size (mm) for the official white logo at a given max height. */
function officialLogoSize(
  ctx: RenderCtx,
  maxHeight: number,
  maxWidth = 48
): { width: number; height: number } {
  if (!ctx.logo) return { width: 16, height: maxHeight };
  return fitImageRect(ctx.logo.width, ctx.logo.height, maxWidth, maxHeight);
}

/**
 * Official white RSM logo (`public/RSM Logo - White.png`), always anchored to
 * the right edge on a dark background. Falls back to a white wordmark when the
 * image could not be loaded.
 */
function drawOfficialLogo(
  doc: jsPDF,
  ctx: RenderCtx,
  right: number,
  top: number,
  maxHeight: number
) {
  const { width, height } = officialLogoSize(ctx, maxHeight);
  if (ctx.logo) {
    try {
      doc.addImage(ctx.logo.dataUrl, "PNG", right - width, top, width, height);
      return;
    } catch {
      // Fall through to the text wordmark.
    }
  }
  doc.setTextColor(...THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("RSM", right, top + maxHeight - 1, { align: "right" });
  doc.setFont("helvetica", "normal");
}

function renderCoverPage(doc: jsPDF, ctx: RenderCtx) {
  if (ctx.coverImage) {
    try {
      // Full-bleed A4 cover artwork from public/pdf/pdf-cover-page.png.
      doc.addImage(
        ctx.coverImage.dataUrl,
        "PNG",
        0,
        0,
        PAGE.width,
        PAGE.height
      );
      return;
    } catch {
      // Fall through to the programmatic cover.
    }
  }

  doc.setFillColor(...THEME.navy);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");

  drawOfficialLogo(doc, ctx, PAGE.width - PAGE.margin, PAGE.margin, 15);

  doc.setTextColor(...THEME.blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(MIN_FONT);
  doc.text(ANNUAL_CX_COVER_SUBTITLE.toUpperCase(), PAGE.margin, 78);

  doc.setFillColor(...THEME.green);
  doc.rect(PAGE.margin, 84, 36, 1.4, "F");

  // Header order: title, tagline below it, reporting period below the tagline.
  doc.setTextColor(...THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(27);
  doc.text(ANNUAL_CX_COVER_TITLE, PAGE.margin, 100);

  doc.setTextColor(...THEME.green);
  doc.setFontSize(15);
  doc.text(ANNUAL_CX_TAGLINE, PAGE.margin, 112);

  doc.setTextColor(180, 190, 205);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(MIN_FONT);
  doc.text("REPORTING PERIOD", PAGE.margin, 128);
  doc.setTextColor(...THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  wrapText(doc, ctx.plan.currentLabel, PAGE.margin, 136, ctx.contentWidth, 6);

  doc.setTextColor(...THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(MIN_FONT);
  doc.text(FOOTER_LEFT_LINE, PAGE.margin, PAGE.height - 26);
  doc.text(FOOTER_LEGAL_NAME, PAGE.width - PAGE.margin, PAGE.height - 26, {
    align: "right",
  });

  doc.setFillColor(...THEME.green);
  doc.rect(0, PAGE.height - 18, PAGE.width, 6, "F");
  doc.setFillColor(...THEME.blue);
  doc.rect(0, PAGE.height - 12, PAGE.width, 12, "F");
}

function renderPhilosophyPage(doc: jsPDF, ctx: RenderCtx) {
  fillPage(doc);
  drawInnerHeader(doc, ctx);
  let y = 38;
  y = sectionTitle(doc, "Our Approach: Understanding the Voice of the Clients", y);
  const paragraphs = philosophyCopy(ctx.plan.currentLabel);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...THEME.body);
  for (const paragraph of paragraphs) {
    y = wrapText(doc, paragraph, PAGE.margin, y, ctx.contentWidth, 5) + 6;
  }

  y += 4;
  doc.setTextColor(...THEME.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Client Experience Dashboard overview", PAGE.margin, y);
  y += 6;

  const responseRate = ctx.currentOutreach.surveysSent
    ? Math.round(
        (ctx.responseCount / ctx.currentOutreach.surveysSent) * 100
      )
    : null;
  const stats: Array<{ label: string; value: string; color: PdfRgb }> = [
    {
      label: "Surveys sent",
      value: String(ctx.currentOutreach.surveysSent),
      color: THEME.blue,
    },
    {
      label: "Responses received",
      value: String(ctx.responseCount),
      color: THEME.green,
    },
    {
      label: "Response rate",
      value: responseRate === null ? "—" : `${responseRate}%`,
      color: THEME.navy,
    },
    {
      label: "Positive responses",
      value: `${ctx.currentReport.positivePercent}%`,
      color: THEME.green,
    },
  ];
  const tileW = (ctx.contentWidth - 4) / 2;
  stats.forEach((stat, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = PAGE.margin + col * (tileW + 4);
    const tileY = y + row * 28;
    doc.setFillColor(...THEME.surface);
    doc.setDrawColor(...THEME.border);
    doc.roundedRect(x, tileY, tileW, 24, 2, 2, "FD");
    doc.setFillColor(...stat.color);
    doc.rect(x, tileY, 3, 24, "F");
    doc.setTextColor(...THEME.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(MIN_FONT);
    doc.text(stat.label, x + 8, tileY + 9);
    doc.setTextColor(...stat.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(stat.value, x + 8, tileY + 19);
  });
  y += 62;

  doc.setFillColor(...THEME.navy);
  doc.roundedRect(PAGE.margin, y, ctx.contentWidth, 26, 2, 2, "F");
  doc.setTextColor(...THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(CONTACT_BLOCK.tagline, PAGE.margin + 6, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(MIN_FONT);
  doc.text(CONTACT_BLOCK.services, PAGE.margin + 6, y + 19);
  y += 38;

  doc.setTextColor(...THEME.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("In this report", PAGE.margin, y);
  y += 6;
  const contents: Array<{ title: string; page: string }> = [
    { title: "Performance indicators and gauges", page: "Page 3" },
    { title: "How we run the listening programme", page: "Page 4" },
    { title: "Client testimonials, in their own words", page: "Pages 8–9" },
    { title: "Where we aim to improve", page: "Page 10" },
  ];
  const contentW = (ctx.contentWidth - 4) / 2;
  contents.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = PAGE.margin + col * (contentW + 4);
    const tileY = y + row * 26;
    doc.setFillColor(...THEME.surface);
    doc.setDrawColor(...THEME.border);
    doc.roundedRect(x, tileY, contentW, 22, 2, 2, "FD");
    doc.setTextColor(...THEME.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(MIN_FONT);
    wrapText(doc, item.title, x + 5, tileY + 9, contentW - 10, 4.2);
    doc.setTextColor(...THEME.green);
    doc.text(item.page, x + 5, tileY + 18);
  });

  drawFlyerFooter(doc, ctx, 2);
}

function renderKpiDashboardPage(doc: jsPDF, ctx: RenderCtx) {
  fillPage(doc);
  drawInnerHeader(doc, ctx);
  let y = 38;
  y = sectionTitle(doc, "Voice of Clients Performance Indicators", y);

  const cards: Array<{
    title: string;
    value: string;
    delta: string | null;
    color: PdfRgb;
    fraction: number | null;
  }> = [
    {
      title: "Customer Satisfaction (CSAT)",
      value:
        ctx.currentReport.csat.count != null && ctx.currentReport.csat.count > 0
          ? `${ctx.currentReport.csat.favorablePercent}%`
          : "—",
      delta: formatDeltaLabel(ctx.comparison.csatPercent.delta, "pt"),
      color: THEME.green,
      fraction: ctx.currentReport.csat.count
        ? ctx.currentReport.csat.favorablePercent / 100
        : null,
    },
    {
      title: "Net Promoter Score (NPS)",
      value:
        ctx.currentReport.nps.score === null
          ? "—"
          : String(ctx.currentReport.nps.score),
      delta: formatDeltaLabel(ctx.comparison.npsScore.delta, "pt"),
      color: THEME.blue,
      fraction:
        ctx.currentReport.nps.score === null
          ? null
          : (ctx.currentReport.nps.score + 100) / 200,
    },
    {
      title: "Customer Effort Score (CES)",
      value:
        ctx.currentReport.ces.average === null
          ? "—"
          : ctx.currentReport.ces.average.toFixed(1),
      delta: formatDeltaLabel(ctx.comparison.cesAverage.delta, "pt"),
      color: THEME.grey,
      fraction:
        ctx.currentReport.ces.average === null
          ? null
          : (ctx.currentReport.ces.average - 1) / 6,
    },
  ];

  const cardW = (ctx.contentWidth - 8) / 3;
  cards.forEach((card, index) => {
    const x = PAGE.margin + index * (cardW + 4);
    doc.setFillColor(...THEME.surface);
    doc.setDrawColor(...THEME.border);
    doc.roundedRect(x, y, cardW, 62, 2, 2, "FD");
    doc.setFillColor(...card.color);
    doc.rect(x, y, cardW, 3, "F");
    doc.setTextColor(...THEME.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(MIN_FONT);
    wrapText(doc, card.title, x + 4, y + 11, cardW - 8, 4);
    if (card.fraction !== null) {
      drawGauge(doc, x + cardW / 2, y + 40, 15, card.fraction, card.color);
    }
    doc.setTextColor(...card.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(card.value, x + cardW / 2, y + 43, { align: "center" });
    doc.setTextColor(...THEME.body);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(MIN_FONT);
    doc.text(card.delta ?? "No prior period", x + cardW / 2, y + 56, {
      align: "center",
    });
  });
  y += 70;

  doc.setFillColor(...THEME.panel);
  doc.roundedRect(PAGE.margin, y, ctx.contentWidth, 34, 2, 2, "F");
  doc.setTextColor(...THEME.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Response volume", PAGE.margin + 4, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(MIN_FONT);
  doc.setTextColor(...THEME.body);
  const volumeText = volumeNarrative({
    surveysSent: ctx.currentOutreach.surveysSent,
    responsesReceived: ctx.responseCount,
    priorResponses: ctx.comparison.responseCount.hasPrior
      ? ctx.comparison.responseCount.prior
      : null,
    responseRate: ctx.currentOutreach.surveysSent
      ? ctx.currentOutreach.responseRate
      : null,
    priorResponseRate: ctx.comparison.responseRate.hasPrior
      ? ctx.comparison.responseRate.prior
      : null,
  });
  wrapText(doc, volumeText, PAGE.margin + 4, y + 16, ctx.contentWidth - 8, 4.4);
  y += 42;

  y = sectionTitle(doc, "How We Listen", y);
  drawListenTimeline(doc, ctx, y);

  drawFlyerFooter(doc, ctx, 3);
}

/** Step-by-step timeline: connector line, numbered nodes, title and body below. */
function drawListenTimeline(doc: jsPDF, ctx: RenderCtx, y: number) {
  const steps = HOW_WE_LISTEN_STEPS;
  const stepW = ctx.contentWidth / steps.length;
  const lineY = y + 8;
  doc.setDrawColor(...THEME.border);
  doc.setLineWidth(0.6);
  doc.line(PAGE.margin + stepW / 2, lineY, PAGE.width - PAGE.margin - stepW / 2, lineY);
  // Arrow head at the end of the timeline.
  doc.setFillColor(...THEME.green);
  doc.triangle(
    PAGE.width - PAGE.margin - stepW / 2,
    lineY - 2,
    PAGE.width - PAGE.margin - stepW / 2,
    lineY + 2,
    PAGE.width - PAGE.margin - stepW / 2 + 4,
    lineY,
    "F"
  );

  steps.forEach((step, index) => {
    const cx = PAGE.margin + stepW * index + stepW / 2;
    doc.setFillColor(...THEME.green);
    doc.circle(cx, lineY, 5.5, "F");
    doc.setTextColor(...THEME.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(index + 1), cx, lineY + 1.8, { align: "center" });
    doc.setTextColor(...THEME.muted);
    doc.setFontSize(MIN_FONT);
    doc.text(`STEP 0${index + 1}`, cx, lineY + 13, { align: "center" });
    doc.setTextColor(...THEME.navy);
    doc.setFont("helvetica", "bold");
    wrapText(doc, step.title, PAGE.margin + stepW * index + 3, lineY + 20, stepW - 6, 4);
    doc.setTextColor(...THEME.body);
    doc.setFont("helvetica", "normal");
    wrapText(doc, step.body, PAGE.margin + stepW * index + 3, lineY + 30, stepW - 6, 4.2);
  });
}

function renderListeningProgrammePage(doc: jsPDF, ctx: RenderCtx) {
  fillPage(doc);
  drawInnerHeader(doc, ctx);
  let y = 38;
  y = sectionTitle(doc, "How We Run the Listening Programme", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(MIN_FONT);
  doc.setTextColor(...THEME.body);
  y =
    wrapText(
      doc,
      "RSM in Kuwait follows a set of structured practices to measure the voice of clients and to support ongoing service improvement.",
      PAGE.margin,
      y,
      ctx.contentWidth,
      4.4
    ) + 6;

  const colW = (ctx.contentWidth - 4) / 2;
  LISTENING_PROGRAMME_PRACTICES.forEach((practice, index) => {
    const isLastOdd =
      index === LISTENING_PROGRAMME_PRACTICES.length - 1 &&
      LISTENING_PROGRAMME_PRACTICES.length % 2 === 1;
    const col = isLastOdd ? 0 : index % 2;
    const row = Math.floor(index / 2);
    const x = PAGE.margin + col * (colW + 4);
    const width = isLastOdd ? ctx.contentWidth : colW;
    const boxY = y + row * 38;
    doc.setFillColor(...THEME.surface);
    doc.setDrawColor(...THEME.border);
    doc.roundedRect(x, boxY, width, 34, 1.5, 1.5, "FD");
    doc.setFillColor(...THEME.blue);
    doc.rect(x, boxY, 2.2, 34, "F");
    doc.setTextColor(...THEME.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(MIN_FONT);
    wrapText(doc, practice.title, x + 6, boxY + 8, width - 10, 4);
    doc.setTextColor(...THEME.body);
    doc.setFont("helvetica", "normal");
    wrapText(doc, practice.body, x + 6, boxY + 17, width - 10, 4.2);
  });
  y += Math.ceil(LISTENING_PROGRAMME_PRACTICES.length / 2) * 38 + 4;

  y = sectionTitle(doc, "Three Question Cards", y);
  const cards = surveyQuestionCards();
  const cardW = (ctx.contentWidth - 8) / 3;
  const metricColors: Record<string, PdfRgb> = {
    CSAT: THEME.green,
    CES: THEME.grey,
    NPS: THEME.blue,
  };
  const scaleLabels: Record<string, string> = {
    CSAT: "Scale 1–5",
    CES: "Scale 1–7",
    NPS: "Scale 0–10",
  };
  cards.forEach((card, index) => {
    const x = PAGE.margin + index * (cardW + 4);
    doc.setFillColor(...THEME.paleBlue);
    doc.roundedRect(x, y, cardW, 48, 2, 2, "F");
    doc.setTextColor(...(metricColors[card.metric] ?? THEME.blue));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(card.metric, x + 4, y + 10);
    doc.setTextColor(...THEME.body);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(MIN_FONT);
    wrapText(doc, `"${card.question}"`, x + 4, y + 17, cardW - 8, 4.2);
    doc.setTextColor(...THEME.navy);
    doc.setFont("helvetica", "bold");
    doc.text(scaleLabels[card.metric] ?? "", x + 4, y + 42);
  });

  drawFlyerFooter(doc, ctx, 4);
}

function renderMetricsDeepDivePage(doc: jsPDF, ctx: RenderCtx) {
  fillPage(doc);
  drawInnerHeader(doc, ctx);
  let y = 38;
  y = sectionTitle(doc, "Key Performance Indicators", y);

  const report = ctx.currentReport;
  const blocks: Array<{
    title: string;
    score: string;
    detail: string;
    color: PdfRgb;
    distribution: number[];
    labels: string[];
  }> = [
    {
      title: "Customer Satisfaction (CSAT)",
      score: report.csat.count ? `${report.csat.favorablePercent}%` : "—",
      detail: report.csat.count
        ? `${(report.csat.distribution[3] ?? 0) + (report.csat.distribution[4] ?? 0)} of ${report.csat.count} clients rated 4 or 5. Target: ${ANNUAL_CX_TARGETS.csatPercent}% or above.`
        : "No CSAT ratings in this period.",
      color: THEME.green,
      distribution: report.csat.distribution,
      labels: ["1", "2", "3", "4", "5"],
    },
    {
      title: "Net Promoter Score (NPS)",
      score: report.nps.score === null ? "—" : String(report.nps.score),
      detail: report.nps.count
        ? `${report.nps.promoters} promoters and ${report.nps.detractors} detractors from ${report.nps.count} responses. Target: ${ANNUAL_CX_TARGETS.npsScore}.`
        : "No NPS ratings in this period.",
      color: THEME.blue,
      distribution: [
        report.nps.promoters,
        report.nps.passives,
        report.nps.detractors,
      ],
      labels: ["Promoters", "Neutral", "Detractors"],
    },
    {
      title: "Customer Effort Score (CES)",
      score:
        report.ces.average === null ? "—" : report.ces.average.toFixed(1),
      detail: report.ces.count
        ? `Average ${report.ces.average?.toFixed(1)} from ${report.ces.count} responses. Target: ${ANNUAL_CX_TARGETS.cesAverage} or above.`
        : "No CES ratings in this period.",
      color: THEME.grey,
      distribution: report.ces.distribution,
      labels: ["1", "2", "3", "4", "5", "6", "7"],
    },
  ];

  blocks.forEach((block) => {
    doc.setFillColor(...THEME.surface);
    doc.setDrawColor(...THEME.border);
    doc.roundedRect(PAGE.margin, y, ctx.contentWidth, 58, 2, 2, "FD");
    doc.setFillColor(...block.color);
    doc.rect(PAGE.margin, y, 3, 58, "F");
    doc.setTextColor(...THEME.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(block.title, PAGE.margin + 8, y + 9);
    doc.setTextColor(...block.color);
    doc.setFontSize(17);
    doc.text(block.score, PAGE.margin + 8, y + 22);
    doc.setTextColor(...THEME.body);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(MIN_FONT);
    wrapText(doc, block.detail, PAGE.margin + 8, y + 29, ctx.contentWidth - 14, 4.2);
    drawMiniBars(
      doc,
      PAGE.margin + 8,
      y + 40,
      ctx.contentWidth - 16,
      block.distribution,
      block.labels,
      block.color
    );
    y += 64;
  });

  drawFlyerFooter(doc, ctx, 5);
}

function resolveOutlookBodies(ctx: RenderCtx) {
  if (ctx.aiNarrative) {
    return {
      intro: ctx.aiNarrative.executiveSummary,
      csat: ctx.aiNarrative.csatNarrative,
      nps: ctx.aiNarrative.npsNarrative,
      ces: ctx.aiNarrative.cesNarrative,
      themes: ctx.aiNarrative.voiceOfClientThemes,
      outlook: ctx.aiNarrative.outlook,
    };
  }
  const bodies = buildOutlookBodies({
    report: ctx.currentReport,
    outreach: ctx.currentOutreach,
  });
  return { ...bodies, themes: null as string | null, outlook: null as string | null };
}

function renderSummaryOutlookPage(doc: jsPDF, ctx: RenderCtx) {
  fillPage(doc);
  drawInnerHeader(doc, ctx);
  let y = 38;
  y = sectionTitle(doc, "Summary and Outlook", y);
  const bodies = resolveOutlookBodies(ctx);
  if (ctx.aiNarrative) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(MIN_FONT);
    doc.setTextColor(...THEME.muted);
    y =
      wrapText(
        doc,
        "AI-assisted draft for CX review. Charts and KPIs remain calculated from survey data.",
        PAGE.margin,
        y,
        ctx.contentWidth,
        4.2
      ) + 6;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...THEME.body);
  y = wrapText(doc, bodies.intro, PAGE.margin, y, ctx.contentWidth, 4.8) + 8;

  const sections = [
    { title: "Customer Satisfaction", body: bodies.csat, color: THEME.green },
    { title: "Net Promoter Score", body: bodies.nps, color: THEME.blue },
    { title: "Customer Effort Score", body: bodies.ces, color: THEME.grey },
  ];
  sections.forEach((section) => {
    const startY = y;
    doc.setTextColor(...section.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(section.title, PAGE.margin + 4, y + 7);
    doc.setTextColor(...THEME.body);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(MIN_FONT);
    const endY =
      wrapText(
        doc,
        section.body,
        PAGE.margin + 4,
        y + 14,
        ctx.contentWidth - 8,
        4.4
      ) + 5;
    doc.setDrawColor(...THEME.border);
    doc.roundedRect(PAGE.margin, startY, ctx.contentWidth, endY - startY, 2, 2, "D");
    doc.setFillColor(...section.color);
    doc.rect(PAGE.margin, startY, 2.2, endY - startY, "F");
    y = endY + 6;
  });

  if (bodies.themes) {
    const startY = y;
    doc.setTextColor(...THEME.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Voice of Clients themes", PAGE.margin + 4, y + 7);
    doc.setTextColor(...THEME.body);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(MIN_FONT);
    const endY =
      wrapText(
        doc,
        bodies.themes,
        PAGE.margin + 4,
        y + 14,
        ctx.contentWidth - 8,
        4.4
      ) + 5;
    doc.setDrawColor(...THEME.border);
    doc.roundedRect(PAGE.margin, startY, ctx.contentWidth, endY - startY, 2, 2, "D");
    y = endY + 6;
  }

  if (bodies.outlook) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...THEME.body);
    y = wrapText(doc, bodies.outlook, PAGE.margin, y, ctx.contentWidth, 4.8) + 6;
  }

  doc.setFontSize(MIN_FONT);
  doc.setTextColor(...THEME.muted);
  y = wrapText(doc, methodologyNpsFootnote(), PAGE.margin, y + 2, ctx.contentWidth, 4.2) + 3;
  wrapText(doc, methodologyCesFootnote(), PAGE.margin, y, ctx.contentWidth, 4.2);
  drawFlyerFooter(doc, ctx, 6);
}

function renderPerformanceTargetsPage(doc: jsPDF, ctx: RenderCtx) {
  fillPage(doc);
  drawInnerHeader(doc, ctx);
  let y = 38;
  y = sectionTitle(doc, "Performance against target", y);
  const copy = performanceAgainstTargetCopy({
    comparison: ctx.comparison,
    targets: ANNUAL_CX_TARGETS,
  });

  const rows = [
    {
      label: "CSAT",
      current: ctx.comparison.csatPercent.current,
      prior: ctx.comparison.csatPercent.prior,
      target: ANNUAL_CX_TARGETS.csatPercent as number,
      text: copy.csat,
      color: THEME.green,
      format: (v: number) => `${v}%`,
      fraction: (v: number) => v / 100,
    },
    {
      label: "NPS",
      current: ctx.comparison.npsScore.current,
      prior: ctx.comparison.npsScore.prior,
      target: ANNUAL_CX_TARGETS.npsScore as number,
      text: copy.nps,
      color: THEME.blue,
      format: (v: number) => String(v),
      fraction: (v: number) => (v + 100) / 200,
    },
    {
      label: "CES",
      current: ctx.comparison.cesAverage.current,
      prior: ctx.comparison.cesAverage.prior,
      target: ANNUAL_CX_TARGETS.cesAverage as number,
      text: copy.ces,
      color: THEME.grey,
      format: (v: number) => v.toFixed(1),
      fraction: (v: number) => v / 7,
    },
  ];

  rows.forEach((row) => {
    doc.setFillColor(...THEME.surface);
    doc.setDrawColor(...THEME.border);
    doc.roundedRect(PAGE.margin, y, ctx.contentWidth, 60, 2, 2, "FD");
    doc.setTextColor(...row.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(row.label, PAGE.margin + 4, y + 11);
    doc.setFontSize(17);
    doc.text(
      row.current === null ? "—" : row.format(row.current),
      PAGE.margin + 4,
      y + 24
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(MIN_FONT);
    doc.setTextColor(...THEME.body);
    doc.text(
      `Target: ${row.format(row.target)}${row.prior !== null ? `  ·  Prior: ${row.format(row.prior)}` : ""}`,
      PAGE.margin + 4,
      y + 32
    );
    if (row.current !== null) {
      drawTargetBar(
        doc,
        PAGE.margin + 58,
        y + 18,
        ctx.contentWidth - 64,
        row.fraction(row.current),
        row.fraction(row.target),
        row.color
      );
    }
    doc.setTextColor(...THEME.body);
    doc.setFontSize(MIN_FONT);
    wrapText(doc, row.text, PAGE.margin + 4, y + 40, ctx.contentWidth - 8, 4.2);
    y += 66;
  });

  drawFlyerFooter(doc, ctx, 7);
}

function renderQuotesPage(doc: jsPDF, ctx: RenderCtx, offset: number) {
  fillPage(doc);
  drawInnerHeader(doc, ctx);
  let y = 38;
  if (offset === 0) {
    y = sectionTitle(doc, "The Voice of Clients", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(MIN_FONT);
    doc.setTextColor(...THEME.body);
    y = wrapText(doc, quotesSectionIntro(), PAGE.margin, y, ctx.contentWidth, 4.4) + 6;
  } else {
    y = sectionTitle(doc, "The Voice of Clients (continued)", y);
  }

  const slice = ctx.quotes.slice(offset, offset + 3);
  if (!slice.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(MIN_FONT);
    doc.setTextColor(...THEME.muted);
    doc.text(
      "Published client testimonials with consent will appear here when available.",
      PAGE.margin,
      y + 8
    );
    drawFlyerFooter(doc, ctx, offset === 0 ? 8 : 9);
    return;
  }

  const metricColors: Record<string, PdfRgb> = {
    csat: THEME.green,
    nps: THEME.blue,
    ces: THEME.grey,
  };

  slice.forEach((quote) => {
    const boxTop = y;
    const metricColor = quote.metric ? metricColors[quote.metric] : THEME.green;
    doc.setTextColor(...(metricColor ?? THEME.green));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("“", PAGE.margin + 4, y + 11);
    if (quote.metric) {
      doc.setFontSize(MIN_FONT);
      doc.text(
        ANNUAL_CX_METRIC_LABELS[quote.metric].toUpperCase(),
        PAGE.margin + 11,
        y + 8
      );
    }
    doc.setTextColor(...THEME.body);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const textEnd = wrapText(
      doc,
      quote.text,
      PAGE.margin + 11,
      y + 15,
      ctx.contentWidth - 17,
      4.6
    );
    let attrY = textEnd + 5;
    if (quote.showAttribution) {
      doc.setTextColor(...THEME.navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(MIN_FONT);
      const attribution = [quote.respondentName, quote.company]
        .filter(Boolean)
        .join(" · ");
      if (attribution) {
        doc.text(attribution, PAGE.margin + 11, attrY);
        attrY += 5;
      }
    }
    doc.setFillColor(...THEME.surface);
    doc.setDrawColor(...THEME.border);
    doc.roundedRect(PAGE.margin, boxTop, ctx.contentWidth, attrY - boxTop + 5, 2, 2, "D");
    doc.setFillColor(...(metricColor ?? THEME.green));
    doc.rect(PAGE.margin, boxTop, 2.2, attrY - boxTop + 5, "F");
    y = attrY + 11;
  });

  drawFlyerFooter(doc, ctx, offset === 0 ? 8 : 9);
}

function renderImprovePage(doc: jsPDF, ctx: RenderCtx) {
  fillPage(doc);
  drawInnerHeader(doc, ctx);
  let y = 38;
  y = sectionTitle(doc, "Where We Aim to Improve", y);
  const themeW = (ctx.contentWidth - 8) / 3;
  IMPROVEMENT_THEMES.forEach((theme, index) => {
    const x = PAGE.margin + index * (themeW + 4);
    doc.setFillColor(...THEME.paleGreen);
    doc.roundedRect(x, y, themeW, 58, 2, 2, "F");
    doc.setTextColor(...THEME.green);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(theme.title, x + 4, y + 9);
    doc.setTextColor(...THEME.body);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(MIN_FONT);
    wrapText(doc, theme.body, x + 4, y + 15, themeW - 8, 4.2);
  });
  y += 66;

  y = sectionTitle(doc, "From Insight to Action", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(MIN_FONT);
  doc.setTextColor(...THEME.body);
  y = wrapText(doc, FROM_INSIGHT_TO_ACTION, PAGE.margin, y, ctx.contentWidth, 4.4) + 6;

  const colW = (ctx.contentWidth - 6) / 2;
  GOVERNANCE_BLOCKS.forEach((block, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = PAGE.margin + col * (colW + 6);
    const boxY = y + row * 42;
    doc.setFillColor(...THEME.surface);
    doc.setDrawColor(...THEME.border);
    doc.roundedRect(x, boxY, colW, 38, 2, 2, "FD");
    doc.setTextColor(...THEME.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(MIN_FONT);
    doc.text(block.title, x + 3, boxY + 8);
    doc.setTextColor(...THEME.body);
    doc.setFont("helvetica", "normal");
    wrapText(doc, block.body, x + 3, boxY + 14, colW - 6, 4.2);
  });

  drawFlyerFooter(doc, ctx, 10);
}

function renderConclusionPage(doc: jsPDF, ctx: RenderCtx) {
  fillPage(doc);
  drawInnerHeader(doc, ctx);
  let y = 50;
  y = sectionTitle(doc, "Conclusion & Future Outlook", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...THEME.body);
  for (const paragraph of conclusionCopy(ctx.plan.currentLabel)) {
    y = wrapText(doc, paragraph, PAGE.margin, y, ctx.contentWidth, 5.5) + 8;
  }

  y += 6;
  const summaryStats: Array<{ label: string; value: string; color: PdfRgb }> = [
    {
      label: "CSAT",
      value: ctx.currentReport.csat.count
        ? `${ctx.currentReport.csat.favorablePercent}%`
        : "—",
      color: THEME.green,
    },
    {
      label: "NPS",
      value:
        ctx.currentReport.nps.score === null
          ? "—"
          : String(ctx.currentReport.nps.score),
      color: THEME.blue,
    },
    {
      label: "CES",
      value:
        ctx.currentReport.ces.average === null
          ? "—"
          : ctx.currentReport.ces.average.toFixed(1),
      color: THEME.grey,
    },
  ];
  const statW = (ctx.contentWidth - 8) / 3;
  summaryStats.forEach((stat, index) => {
    const x = PAGE.margin + index * (statW + 4);
    doc.setFillColor(...THEME.surface);
    doc.setDrawColor(...THEME.border);
    doc.roundedRect(x, y, statW, 30, 2, 2, "FD");
    doc.setTextColor(...THEME.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(MIN_FONT);
    doc.text(stat.label, x + 5, y + 10);
    doc.setTextColor(...stat.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(stat.value, x + 5, y + 23);
  });
  y += 42;

  doc.setFillColor(...THEME.navy);
  doc.roundedRect(PAGE.margin, y, ctx.contentWidth, 26, 2, 2, "F");
  doc.setTextColor(...THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(ANNUAL_CX_TAGLINE, PAGE.margin + 6, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(MIN_FONT);
  doc.text(CONTACT_BLOCK.services, PAGE.margin + 6, y + 19);

  drawFlyerFooter(doc, ctx, 11);
}

function renderBackPage(doc: jsPDF, ctx: RenderCtx) {
  doc.setFillColor(...THEME.navy);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");
  void ctx;

  drawOfficialLogo(doc, ctx, PAGE.width - PAGE.margin, PAGE.margin, 15);

  doc.setTextColor(...THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(CONTACT_BLOCK.firm, PAGE.margin, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(MIN_FONT);
  let y = 52;
  for (const line of CONTACT_BLOCK.addressLines) {
    doc.text(line, PAGE.margin, y);
    y += 6;
  }
  y += 4;
  doc.text(CONTACT_BLOCK.phone, PAGE.margin, y);
  y += 6;
  doc.text(CONTACT_BLOCK.email, PAGE.margin, y);
  y += 6;
  doc.text(CONTACT_BLOCK.web, PAGE.margin, y);

  // Disclaimer: legal network text sits in the back-page footer area only.
  y = 118;
  doc.setFontSize(MIN_FONT);
  doc.setTextColor(180, 190, 205);
  for (const paragraph of LEGAL_NETWORK_TEXT) {
    y = wrapText(doc, paragraph, PAGE.margin, y, ctx.contentWidth, 4.4) + 5;
  }

  doc.setTextColor(...THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(FOOTER_LEFT_LINE, PAGE.margin, PAGE.height - 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(MIN_FONT);
  doc.text(CONTACT_BLOCK.services, PAGE.margin, PAGE.height - 27);
  doc.setFont("helvetica", "bold");
  doc.text(
    `${FOOTER_LEGAL_NAME}`,
    PAGE.width - PAGE.margin,
    PAGE.height - 34,
    { align: "right" }
  );
  doc.setFont("helvetica", "normal");
  doc.text(
    `© ${FOOTER_LEGAL_NAME} ${CONTACT_BLOCK.copyrightYear}`,
    PAGE.width - PAGE.margin,
    PAGE.height - 27,
    { align: "right" }
  );
}

function fillPage(doc: jsPDF) {
  doc.setFillColor(...THEME.page);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");
}

function drawInnerHeader(doc: jsPDF, ctx: RenderCtx) {
  // No banner in the header: the navy banner lives in the footer. The header
  // is plain text on the page background (the white logo needs the dark
  // footer band, so it sits there instead).
  doc.setTextColor(...THEME.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(ANNUAL_CX_COVER_TITLE, PAGE.margin, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(MIN_FONT);
  doc.setTextColor(...THEME.muted);
  doc.text(headerPeriodLine(ctx.plan.currentLabel), PAGE.margin, 18);
  doc.setDrawColor(...THEME.border);
  doc.setLineWidth(0.4);
  doc.line(PAGE.margin, 22, PAGE.width - PAGE.margin, 22);
}

function sectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(...THEME.green);
  doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 9, "F");
  doc.setTextColor(...THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, PAGE.margin + 3, y + 6);
  return y + 15;
}

function drawFlyerFooter(doc: jsPDF, ctx: RenderCtx, pageNumber: number) {
  // Navy banner band in the footer of every inner page (moved from the
  // header): brand bars along its top edge, assurance line on the left,
  // legal name + page number, and the official white logo on the right.
  const bandTop = PAGE.height - 20;
  const bars: Array<{ share: number; color: PdfRgb }> = [
    { share: 0.08, color: THEME.grey },
    { share: 0.24, color: THEME.green },
    { share: 0.68, color: THEME.blue },
  ];
  let barX = 0;
  bars.forEach((bar) => {
    const barWidth = PAGE.width * bar.share;
    doc.setFillColor(...bar.color);
    doc.rect(barX, bandTop, barWidth, 1.4, "F");
    barX += barWidth;
  });
  doc.setFillColor(...THEME.navy);
  doc.rect(0, bandTop + 1.4, PAGE.width, PAGE.height - bandTop - 1.4, "F");

  const textY = bandTop + 12;
  doc.setTextColor(...THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(MIN_FONT);
  doc.text(FOOTER_LEFT_LINE, PAGE.margin, textY);

  const logoSize = officialLogoSize(ctx, 12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 205);
  doc.text(
    `${FOOTER_LEGAL_NAME}  ·  ${pageNumber} / ${PAGE_TOTAL_PLACEHOLDER}`,
    PAGE.width - PAGE.margin - logoSize.width - 5,
    textY,
    { align: "right" }
  );

  drawOfficialLogo(doc, ctx, PAGE.width - PAGE.margin, bandTop + 4.4, 12);
}

/** Semicircular gauge: grey track with a coloured value arc. */
function drawGauge(
  doc: jsPDF,
  cx: number,
  cy: number,
  radius: number,
  fraction: number,
  color: PdfRgb
) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const drawArc = (upto: number, arcColor: PdfRgb) => {
    doc.setDrawColor(...arcColor);
    doc.setLineWidth(2.8);
    const steps = 24;
    const endAngle = Math.PI - upto * Math.PI;
    let prevX = cx - radius;
    let prevY = cy;
    for (let i = 1; i <= steps; i += 1) {
      const angle = Math.PI - (upto * Math.PI * i) / steps;
      if (angle < endAngle - 0.001) break;
      const x = cx + radius * Math.cos(angle);
      const yy = cy - radius * Math.sin(angle);
      doc.line(prevX, prevY, x, yy);
      prevX = x;
      prevY = yy;
    }
  };
  drawArc(1, THEME.track);
  if (clamped > 0) drawArc(clamped, color);
  doc.setLineWidth(0.2);
}

/** Horizontal achieved bar with a navy target marker. */
function drawTargetBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  fraction: number,
  targetFraction: number,
  color: PdfRgb
) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const targetX = x + Math.max(0, Math.min(1, targetFraction)) * width;
  doc.setFillColor(...THEME.track);
  doc.roundedRect(x, y, width, 5, 1, 1, "F");
  doc.setFillColor(...color);
  if (clamped > 0) doc.roundedRect(x, y, Math.max(2, width * clamped), 5, 1, 1, "F");
  doc.setFillColor(...THEME.navy);
  doc.rect(targetX - 0.5, y - 2, 1, 9, "F");
  doc.setTextColor(...THEME.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(MIN_FONT);
  doc.text("Target", targetX, y - 3.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.muted);
  doc.text("Achieved", x, y - 3.5);
}

function drawMiniBars(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  values: number[],
  labels: string[],
  color: PdfRgb
) {
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const gap = 2;
  const barW = (width - gap * (values.length - 1)) / values.length;
  values.forEach((value, index) => {
    const bx = x + index * (barW + gap);
    const height = Math.max(1.5, (value / total) * 8);
    doc.setFillColor(...THEME.track);
    doc.rect(bx, y, barW, 8, "F");
    if (value > 0) {
      doc.setFillColor(...color);
      doc.rect(bx, y + (8 - height), barW, height, "F");
    }
    doc.setTextColor(...THEME.muted);
    doc.setFontSize(MIN_FONT);
    doc.text(labels[index] ?? "", bx + barW / 2, y + 13, { align: "center" });
  });
}

function wrapText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function fitImageRect(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number
) {
  const aspect = naturalWidth / naturalHeight;
  let height = maxHeight;
  let width = height * aspect;
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspect;
  }
  return { width, height };
}

function resolvePdfAssetUrl(path: string) {
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  if (base) {
    const origin = base.startsWith("http") ? base : `https://${base}`;
    return new URL(path, origin).toString();
  }
  return path;
}

async function loadImage(
  url: string,
  options?: { cropTransparent?: boolean }
): Promise<LoadedImage | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const dimensions = await readImageDimensions(dataUrl);
    if (options?.cropTransparent === false) {
      return { dataUrl, ...dimensions };
    }
    const cropped = await cropTransparentMargins(dataUrl).catch(() => null);
    return cropped ?? { dataUrl, ...dimensions };
  } catch {
    return null;
  }
}

/**
 * The official logo PNG is a large square canvas with the artwork centred;
 * crop the transparent margins (and downscale) so it renders at full size in
 * the PDF. Returns null outside the browser or when there is nothing to crop.
 */
async function cropTransparentMargins(
  dataUrl: string
): Promise<LoadedImage | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return null;
  }
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load logo image."));
    img.src = dataUrl;
  });

  // Scan a downscaled copy to find the non-transparent bounding box.
  const scanScale = Math.min(1, 1000 / image.naturalWidth);
  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = Math.max(1, Math.round(image.naturalWidth * scanScale));
  scanCanvas.height = Math.max(1, Math.round(image.naturalHeight * scanScale));
  const scanCtx = scanCanvas.getContext("2d");
  if (!scanCtx) return null;
  scanCtx.drawImage(image, 0, 0, scanCanvas.width, scanCanvas.height);
  const pixels = scanCtx.getImageData(
    0,
    0,
    scanCanvas.width,
    scanCanvas.height
  ).data;
  let minX = scanCanvas.width;
  let minY = scanCanvas.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < scanCanvas.height; y += 1) {
    for (let x = 0; x < scanCanvas.width; x += 1) {
      if (pixels[(y * scanCanvas.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  const sx = Math.floor(minX / scanScale);
  const sy = Math.floor(minY / scanScale);
  const sWidth = Math.ceil((maxX - minX + 1) / scanScale);
  const sHeight = Math.ceil((maxY - minY + 1) / scanScale);
  const outScale = Math.min(1, 900 / sWidth);
  const outCanvas = document.createElement("canvas");
  outCanvas.width = Math.max(1, Math.round(sWidth * outScale));
  outCanvas.height = Math.max(1, Math.round(sHeight * outScale));
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) return null;
  outCtx.drawImage(
    image,
    sx,
    sy,
    sWidth,
    sHeight,
    0,
    0,
    outCanvas.width,
    outCanvas.height
  );
  return {
    dataUrl: outCanvas.toDataURL("image/png"),
    width: outCanvas.width,
    height: outCanvas.height,
  };
}

function readImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  if (typeof Image === "undefined") {
    return Promise.resolve({ width: 132, height: 44 });
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Unable to read image dimensions."));
    image.src = dataUrl;
  });
}