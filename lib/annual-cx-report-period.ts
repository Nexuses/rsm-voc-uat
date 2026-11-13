import {
  buildDashboardReport,
  type DashboardAnalyticsItem,
  type DashboardReport,
  type DashboardWindow,
} from "@/lib/dashboard-analytics";
import {
  matchesOrgFilters,
  withinCalendarRange,
  type DashboardOrgFilters,
} from "@/lib/dashboard-report-filters";
import type { SurveyInviteRecord, SurveyOutreachStats } from "@/lib/survey-outreach";

type OrgDated = {
  submittedAt: string;
  department?: string | null;
  partner?: string | null;
  serviceName?: string | null;
  businessManagerName?: string | null;
  jobManagerName?: string | null;
  company?: string | null;
  customerName?: string | null;
  client?: { company?: string | null; name?: string | null } | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MS_90D = 90 * DAY_MS;
const MS_365D = 365 * DAY_MS;

export const ANNUAL_CX_TARGETS = {
  csatPercent: 97,
  npsScore: 70,
  cesAverage: 4.6,
} as const;

export type DateRange = {
  start: Date;
  end: Date;
};

export type AnnualCxPeriodPlan = {
  window: DashboardWindow;
  current: DateRange;
  prior: DateRange;
  currentLabel: string;
  priorLabel: string;
  filenamePeriod: string;
};

export type AnnualCxMetricDelta = {
  current: number | null;
  prior: number | null;
  delta: number | null;
  hasPrior: boolean;
};

export type AnnualCxComparison = {
  csatPercent: AnnualCxMetricDelta;
  npsScore: AnnualCxMetricDelta;
  cesAverage: AnnualCxMetricDelta;
  responseCount: AnnualCxMetricDelta;
  responseRate: AnnualCxMetricDelta;
  surveysSent: AnnualCxMetricDelta;
};

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function endOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatAnnualRangeLabel(range: DateRange) {
  return `${formatDayLabel(range.start)} – ${formatDayLabel(range.end)}`;
}

function priorRangeFor(current: DateRange): DateRange {
  const durationMs = current.end.getTime() - current.start.getTime() + 1;
  const priorEnd = new Date(current.start.getTime() - 1);
  const priorStart = new Date(priorEnd.getTime() - durationMs + 1);
  return {
    start: startOfUtcDay(priorStart),
    end: endOfUtcDay(priorEnd),
  };
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseUtcDay(day: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

export function resolveAnnualCxPeriodPlan(
  window: DashboardWindow,
  now = new Date()
): AnnualCxPeriodPlan {
  const end = endOfUtcDay(now);
  let current: DateRange;

  if (window === "90d") {
    current = {
      start: startOfUtcDay(new Date(end.getTime() - MS_90D + DAY_MS)),
      end,
    };
  } else if (window === "year") {
    current = {
      start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
      end,
    };
  } else {
    // "all" → last 12 months so YoY still has a prior window
    current = {
      start: startOfUtcDay(new Date(end.getTime() - MS_365D + DAY_MS)),
      end,
    };
  }

  const prior = priorRangeFor(current);

  return {
    window,
    current,
    prior,
    currentLabel: formatAnnualRangeLabel(current),
    priorLabel: formatAnnualRangeLabel(prior),
    filenamePeriod:
      window === "90d" ? "90d" : window === "year" ? "year" : "12m",
  };
}

/**
 * Custom-period CX report: prefer explicit dateFrom/dateTo from dashboard
 * filters so the PDF covers exactly that window; otherwise use the reporting
 * period preset (90d / year / 12m).
 */
export function resolvePeriodCxReportPlan(
  window: DashboardWindow,
  org: Pick<DashboardOrgFilters, "dateFrom" | "dateTo">,
  now = new Date()
): AnnualCxPeriodPlan {
  const fromDay = org.dateFrom?.trim() || "";
  const toDay = org.dateTo?.trim() || "";
  if (!fromDay && !toDay) {
    return resolveAnnualCxPeriodPlan(window, now);
  }

  const base = resolveAnnualCxPeriodPlan(window, now);
  const fromParsed = fromDay ? parseUtcDay(fromDay) : null;
  const toParsed = toDay ? parseUtcDay(toDay) : null;
  let start = fromParsed ? startOfUtcDay(fromParsed) : base.current.start;
  let end = toParsed ? endOfUtcDay(toParsed) : base.current.end;
  if (start.getTime() > end.getTime()) {
    const swap = start;
    start = startOfUtcDay(end);
    end = endOfUtcDay(swap);
  }
  const current = { start, end };
  const prior = priorRangeFor(current);
  return {
    window,
    current,
    prior,
    currentLabel: formatAnnualRangeLabel(current),
    priorLabel: formatAnnualRangeLabel(prior),
    filenamePeriod: `${isoDay(start)}_to_${isoDay(end)}`,
  };
}

export function withinDateRange(
  iso: string | null | undefined,
  range: DateRange
) {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return time >= range.start.getTime() && time <= range.end.getTime();
}

export function filterItemsForAnnualRange<T extends OrgDated>(
  items: T[],
  range: DateRange,
  org: DashboardOrgFilters
): T[] {
  return items.filter(
    (item) =>
      withinDateRange(item.submittedAt, range) &&
      withinCalendarRange(item.submittedAt, org.dateFrom, org.dateTo) &&
      matchesOrgFilters(item, org)
  );
}

export function filterInvitesForAnnualRange(
  invites: SurveyInviteRecord[],
  range: DateRange,
  org: DashboardOrgFilters
): SurveyInviteRecord[] {
  return invites.filter(
    (invite) =>
      withinDateRange(invite.sentAt, range) &&
      withinCalendarRange(invite.sentAt, org.dateFrom, org.dateTo) &&
      matchesOrgFilters(invite, org)
  );
}

export function buildOutreachStatsForRange(
  invites: SurveyInviteRecord[]
): SurveyOutreachStats {
  const surveysSent = invites.length;
  const responsesReceived = invites.filter((invite) => invite.completedAt).length;
  const opensTracked = invites.filter((invite) => invite.openedAt).length;
  const startsTracked = invites.filter((invite) => invite.startedAt).length;
  return {
    surveysSent,
    responsesReceived,
    responseRate: surveysSent
      ? Math.round((responsesReceived / surveysSent) * 100)
      : 0,
    opensTracked,
    startsTracked,
  };
}

function metricDelta(
  current: number | null,
  prior: number | null,
  priorCount: number
): AnnualCxMetricDelta {
  const hasPrior = priorCount > 0 && prior !== null;
  return {
    current,
    prior: hasPrior ? prior : null,
    delta:
      hasPrior && current !== null && prior !== null
        ? Number((current - prior).toFixed(1))
        : null,
    hasPrior,
  };
}

export function buildAnnualCxComparison(input: {
  currentReport: DashboardReport;
  priorReport: DashboardReport;
  currentOutreach: SurveyOutreachStats;
  priorOutreach: SurveyOutreachStats;
  currentResponseCount: number;
  priorResponseCount: number;
}): AnnualCxComparison {
  const { currentReport, priorReport, currentOutreach, priorOutreach } = input;
  return {
    csatPercent: metricDelta(
      currentReport.csat.count ? currentReport.csat.favorablePercent : null,
      priorReport.csat.count ? priorReport.csat.favorablePercent : null,
      priorReport.csat.count
    ),
    npsScore: metricDelta(
      currentReport.nps.score,
      priorReport.nps.score,
      priorReport.nps.count
    ),
    cesAverage: metricDelta(
      currentReport.ces.average,
      priorReport.ces.average,
      priorReport.ces.count
    ),
    responseCount: metricDelta(
      input.currentResponseCount,
      input.priorResponseCount,
      input.priorResponseCount
    ),
    responseRate: metricDelta(
      currentOutreach.surveysSent ? currentOutreach.responseRate : null,
      priorOutreach.surveysSent ? priorOutreach.responseRate : null,
      priorOutreach.surveysSent
    ),
    surveysSent: metricDelta(
      currentOutreach.surveysSent,
      priorOutreach.surveysSent,
      priorOutreach.surveysSent
    ),
  };
}

export function buildAnnualCxPeriodReports(input: {
  items: DashboardAnalyticsItem[];
  invites: SurveyInviteRecord[];
  window: DashboardWindow;
  org: DashboardOrgFilters;
  now?: Date;
}) {
  const plan = resolveAnnualCxPeriodPlan(input.window, input.now);
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
  const currentReport = buildDashboardReport(currentItems);
  const priorReport = buildDashboardReport(priorItems);
  const currentOutreach = buildOutreachStatsForRange(currentInvites);
  const priorOutreach = buildOutreachStatsForRange(priorInvites);

  return {
    plan,
    currentItems,
    priorItems,
    currentReport,
    priorReport,
    currentOutreach,
    priorOutreach,
    comparison: buildAnnualCxComparison({
      currentReport,
      priorReport,
      currentOutreach,
      priorOutreach,
      currentResponseCount: currentItems.length,
      priorResponseCount: priorItems.length,
    }),
  };
}

export function formatDeltaLabel(
  delta: number | null,
  unit: "pt" | "%" | "abs" = "pt"
) {
  if (delta === null) return null;
  const sign = delta > 0 ? "+" : "";
  if (unit === "abs") return `${sign}${delta}`;
  if (unit === "%") return `${sign}${delta}%`;
  return `${sign}${delta} pt`;
}
