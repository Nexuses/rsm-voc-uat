import type { DashboardAnalyticsItem } from "@/lib/dashboard-analytics";
import type { CxReportNarrative } from "@/lib/ai/cx-report-narrative";
import {
  ANNUAL_CX_TARGETS,
  buildOutreachStatsForRange,
  filterInvitesForAnnualRange,
  filterItemsForAnnualRange,
  resolveAnnualCxPeriodPlan,
  type AnnualCxPeriodPlan,
  type DateRange,
} from "@/lib/annual-cx-report-period";
import type { DashboardOrgFilters } from "@/lib/dashboard-report-filters";
import type { SurveyInviteRecord } from "@/lib/survey-outreach";
import type { AnnualCxQuote } from "@/lib/testimonials/quotes";

/** Live VoC CES target on the 1–7 scale (annual deck sample uses 5.0). */
export const ANNUAL_CX_LIVE_TARGETS = {
  csatPercent: ANNUAL_CX_TARGETS.csatPercent,
  npsScore: ANNUAL_CX_TARGETS.npsScore,
  cesAverage: 5.0,
} as const;

export type AnnualCxReportDataJson = {
  period: { start_date: string; end_date: string };
  responses: {
    surveys_sent: number;
    received: number;
    prev_received: number;
    prev_response_rate_pct: number;
  };
  csat: {
    very_satisfied: number;
    satisfied: number;
    neutral: number;
    dissatisfied: number;
    prev_pct: number;
    target_pct: number;
  };
  nps: {
    promoters: number;
    neutral: number;
    detractors: number;
    prev_score: number;
    target: number;
  };
  ces: {
    rating_7: number;
    rating_6: number;
    rating_5: number;
    rating_4: number;
    rating_3: number;
    rating_2: number;
    rating_1: number;
    prev_score: number;
    target: number;
  };
  testimonials: Array<{
    quote: string;
    name?: string;
    company?: string;
  }>;
  text_overrides: Record<string, string>;
};

type ScoredItem = DashboardAnalyticsItem & {
  department?: string | null;
  partner?: string | null;
  serviceName?: string | null;
  businessManagerName?: string | null;
  jobManagerName?: string | null;
  company?: string | null;
  customerName?: string | null;
  client?: { company?: string | null; name?: string | null } | null;
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function metricOf(item: ScoredItem, key: "csat" | "ces" | "nps") {
  const direct = item.metrics[key];
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  const answer = item.answers.find((entry) => entry.metric === key);
  return typeof answer?.rating === "number" ? answer.rating : null;
}

function csatBuckets(items: ScoredItem[]) {
  let very_satisfied = 0;
  let satisfied = 0;
  let neutral = 0;
  let dissatisfied = 0;
  for (const item of items) {
    const value = metricOf(item, "csat");
    if (value === null) continue;
    if (value >= 5) very_satisfied += 1;
    else if (value >= 4) satisfied += 1;
    else if (value === 3) neutral += 1;
    else if (value >= 1) dissatisfied += 1;
  }
  return { very_satisfied, satisfied, neutral, dissatisfied };
}

function npsBuckets(items: ScoredItem[]) {
  let promoters = 0;
  let neutral = 0;
  let detractors = 0;
  for (const item of items) {
    const value = metricOf(item, "nps");
    if (value === null) continue;
    if (value >= 9) promoters += 1;
    else if (value >= 7) neutral += 1;
    else if (value >= 0) detractors += 1;
  }
  return { promoters, neutral, detractors };
}

function cesRatings(items: ScoredItem[]) {
  const ratings = {
    rating_7: 0,
    rating_6: 0,
    rating_5: 0,
    rating_4: 0,
    rating_3: 0,
    rating_2: 0,
    rating_1: 0,
  };
  for (const item of items) {
    const value = metricOf(item, "ces");
    if (value === null) continue;
    const rounded = Math.round(value);
    if (rounded >= 1 && rounded <= 7) {
      const key = `rating_${rounded}` as keyof typeof ratings;
      ratings[key] += 1;
    }
  }
  return ratings;
}

function csatFavorablePercent(buckets: ReturnType<typeof csatBuckets>) {
  const total =
    buckets.very_satisfied +
    buckets.satisfied +
    buckets.neutral +
    buckets.dissatisfied;
  if (!total) return 0;
  return Math.round(
    ((buckets.very_satisfied + buckets.satisfied) / total) * 100
  );
}

function npsScore(buckets: ReturnType<typeof npsBuckets>) {
  const total = buckets.promoters + buckets.neutral + buckets.detractors;
  if (!total) return 0;
  return Math.round(
    ((buckets.promoters - buckets.detractors) / total) * 100
  );
}

function cesMean(ratings: ReturnType<typeof cesRatings>) {
  let sum = 0;
  let count = 0;
  for (let rating = 1; rating <= 7; rating++) {
    const n = ratings[`rating_${rating}` as keyof typeof ratings];
    sum += rating * n;
    count += n;
  }
  if (!count) return 0;
  return Math.round((sum / count) * 10) / 10;
}

function narrativeToOverrides(
  narrative: CxReportNarrative | null | undefined
): Record<string, string> {
  if (!narrative) return {};
  return {
    p7_intro: narrative.executiveSummary,
    csat_para: narrative.csatNarrative,
    ces_para: narrative.cesNarrative,
    nps_para: narrative.npsNarrative,
    conclusion: narrative.outlook,
  };
}

function quotesToTestimonials(quotes: AnnualCxQuote[]) {
  return quotes
    .map((quote) => {
      const text = quote.text.trim();
      if (!text) return null;
      const row: { quote: string; name?: string; company?: string } = {
        quote: text,
      };
      if (quote.showAttribution) {
        if (quote.respondentName?.trim()) {
          row.name = quote.respondentName.trim();
        }
        if (quote.company?.trim()) {
          row.company = quote.company.trim();
        }
      }
      return row;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export function buildAnnualCxReportDataJson(input: {
  items: ScoredItem[];
  invites: SurveyInviteRecord[];
  window: Parameters<typeof resolveAnnualCxPeriodPlan>[0];
  org: DashboardOrgFilters;
  quotes: AnnualCxQuote[];
  narrative?: CxReportNarrative | null;
  now?: Date;
  plan?: AnnualCxPeriodPlan;
}): { plan: AnnualCxPeriodPlan; data: AnnualCxReportDataJson } {
  const plan =
    input.plan ?? resolveAnnualCxPeriodPlan(input.window, input.now);
  const currentItems = filterItemsForAnnualRange(
    input.items,
    plan.current,
    input.org
  );
  const priorItems = filterItemsForAnnualRange(
    input.items,
    plan.prior,
    input.org
  );
  const currentInvites = filterInvitesForAnnualRange(
    input.invites,
    plan.current,
    input.org
  );
  const priorInvites = filterInvitesForAnnualRange(
    input.invites,
    plan.prior,
    input.org
  );
  const currentOutreach = buildOutreachStatsForRange(currentInvites);
  const priorOutreach = buildOutreachStatsForRange(priorInvites);

  const currentCsat = csatBuckets(currentItems);
  const priorCsat = csatBuckets(priorItems);
  const currentNps = npsBuckets(currentItems);
  const priorNps = npsBuckets(priorItems);
  const currentCes = cesRatings(currentItems);
  const priorCes = cesRatings(priorItems);

  const data: AnnualCxReportDataJson = {
    period: {
      start_date: isoDate(plan.current.start),
      end_date: isoDate(plan.current.end),
    },
    responses: {
      surveys_sent: currentOutreach.surveysSent,
      received: currentItems.length,
      prev_received: priorItems.length,
      prev_response_rate_pct: priorOutreach.surveysSent
        ? priorOutreach.responseRate
        : 0,
    },
    csat: {
      ...currentCsat,
      prev_pct: csatFavorablePercent(priorCsat),
      target_pct: ANNUAL_CX_LIVE_TARGETS.csatPercent,
    },
    nps: {
      ...currentNps,
      prev_score: npsScore(priorNps),
      target: ANNUAL_CX_LIVE_TARGETS.npsScore,
    },
    ces: {
      ...currentCes,
      prev_score: cesMean(priorCes),
      target: ANNUAL_CX_LIVE_TARGETS.cesAverage,
    },
    testimonials: quotesToTestimonials(input.quotes),
    text_overrides: narrativeToOverrides(input.narrative),
  };

  return { plan, data };
}

export function annualCxFilename(
  plan: AnnualCxPeriodPlan,
  date = new Date()
) {
  return `rsm-cx-annual-report-${plan.filenamePeriod}-${isoDate(date)}.pdf`;
}

export function periodCxFilename(
  plan: AnnualCxPeriodPlan,
  date = new Date()
) {
  return `rsm-cx-period-report-${plan.filenamePeriod}-${isoDate(date)}.pdf`;
}

export function metricCxFilename(
  metric: "csat" | "nps" | "ces",
  plan: AnnualCxPeriodPlan,
  date = new Date()
) {
  return `rsm-${metric}-report-${plan.filenamePeriod}-${isoDate(date)}.pdf`;
}

export function metricHasScores(
  data: AnnualCxReportDataJson,
  metric: "csat" | "nps" | "ces"
) {
  if (metric === "csat") {
    return (
      data.csat.very_satisfied +
        data.csat.satisfied +
        data.csat.neutral +
        data.csat.dissatisfied >
      0
    );
  }
  if (metric === "nps") {
    return data.nps.promoters + data.nps.neutral + data.nps.detractors > 0;
  }
  return (
    data.ces.rating_7 +
      data.ces.rating_6 +
      data.ces.rating_5 +
      data.ces.rating_4 +
      data.ces.rating_3 +
      data.ces.rating_2 +
      data.ces.rating_1 >
    0
  );
}

export function formatRangeForFilename(range: DateRange) {
  return `${isoDate(range.start)}_${isoDate(range.end)}`;
}

export type PartnerCxReportDataJson = AnnualCxReportDataJson & {
  partner: {
    name: string;
    with_comment: number;
    comment_total: number;
    min_theme: number;
    contact: { email: string; phone: string };
    value_themes: Array<{ title: string; count: number; text: string }>;
    improve_themes: Array<{ title: string; count: number; text: string }>;
    focus: Array<{ title: string; text: string }>;
  };
  followup: { raised: number; closed: number };
};

const MIN_THEME_MENTIONS = 2;
const DEFAULT_CONTACT = {
  email: "connect@rsm.com.kw",
  phone: "+965 22961000",
};

function themeCounts(values: string[][]) {
  const counts = new Map<string, number>();
  for (const list of values) {
    for (const raw of list) {
      const title = raw.trim();
      if (!title) continue;
      counts.set(title, (counts.get(title) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= MIN_THEME_MENTIONS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([title, count]) => ({
      title,
      count,
      text: `Mentioned by ${count} of the responses reviewed for this period.`,
    }));
}

/**
 * Partner-specific 3-page report: a single partner's own period results plus
 * themes drawn from their clients' key drivers and risk signals.
 */
export function buildPartnerCxReportDataJson(input: {
  items: ScoredItem[];
  invites: SurveyInviteRecord[];
  partnerName: string;
  partnerEmail?: string | null;
  org: DashboardOrgFilters;
  plan: AnnualCxPeriodPlan;
}): PartnerCxReportDataJson {
  const partnerOrg: DashboardOrgFilters = {
    ...input.org,
    partner: input.partnerName,
  };
  const items = filterItemsForAnnualRange(
    input.items,
    input.plan.current,
    partnerOrg
  );
  const invites = filterInvitesForAnnualRange(
    input.invites,
    input.plan.current,
    partnerOrg
  );
  const outreach = buildOutreachStatsForRange(invites);
  const csat = csatBuckets(items);
  const nps = npsBuckets(items);
  const ces = cesRatings(items);

  const commented = items.filter((item) => item.keyDrivers.length > 0);
  const riskRaised = items.filter((item) => item.riskSignals.length > 0).length;

  const data: AnnualCxReportDataJson = {
    period: {
      start_date: isoDate(input.plan.current.start),
      end_date: isoDate(input.plan.current.end),
    },
    responses: {
      surveys_sent: outreach.surveysSent,
      received: items.length,
      prev_received: 0,
      prev_response_rate_pct: 0,
    },
    csat: { ...csat, prev_pct: 0, target_pct: ANNUAL_CX_LIVE_TARGETS.csatPercent },
    nps: { ...nps, prev_score: 0, target: ANNUAL_CX_LIVE_TARGETS.npsScore },
    ces: { ...ces, prev_score: 0, target: ANNUAL_CX_LIVE_TARGETS.cesAverage },
    testimonials: [],
    text_overrides: {},
  };

  return {
    ...data,
    followup: { raised: riskRaised, closed: 0 },
    partner: {
      name: input.partnerName,
      with_comment: commented.length,
      comment_total: items.length,
      min_theme: MIN_THEME_MENTIONS,
      contact: {
        email: input.partnerEmail?.trim() || DEFAULT_CONTACT.email,
        phone: DEFAULT_CONTACT.phone,
      },
      value_themes: themeCounts(items.map((item) => item.keyDrivers)),
      improve_themes: themeCounts(items.map((item) => item.riskSignals)),
      focus: [],
    },
  };
}

export function partnerCxFilename(
  partnerName: string,
  plan: AnnualCxPeriodPlan,
  date = new Date()
) {
  const slug =
    partnerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "partner";
  return `rsm-partner-report-${slug}-${plan.filenamePeriod}-${isoDate(date)}.pdf`;
}
