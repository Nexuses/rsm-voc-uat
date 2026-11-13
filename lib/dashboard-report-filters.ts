import {
  type DashboardWindow,
  withinDashboardWindow,
} from "@/lib/dashboard-analytics";
import { orgLabelsMatch } from "@/lib/survey-org-structure";
import type { SurveyInviteRecord } from "@/lib/survey-outreach";

export type DashboardOrgFilters = {
  department: string;
  partner: string;
  service: string;
  businessManager: string;
  jobManager: string;
  dateFrom: string;
  dateTo: string;
  company: string;
  respondent: string;
};

export const emptyDashboardOrgFilters: DashboardOrgFilters = {
  department: "",
  partner: "",
  service: "",
  businessManager: "",
  jobManager: "",
  dateFrom: "",
  dateTo: "",
  company: "",
  respondent: "",
};

export type InviteFilterOptions = {
  departments: string[];
  partners: string[];
  services: string[];
  businessManagers: string[];
  jobManagers: string[];
  companies: string[];
  respondents: string[];
};

type OrgFilterable = {
  department?: string | null;
  partner?: string | null;
  serviceName?: string | null;
  businessManagerName?: string | null;
  jobManagerName?: string | null;
  company?: string | null;
  customerName?: string | null;
  submittedAt?: string;
  sentAt?: string | null;
  client?: { company?: string | null; name?: string | null } | null;
};

export function withinCalendarRange(
  iso: string | null | undefined,
  from: string,
  to: string
) {
  if (!from && !to) return true;
  if (!iso) return false;
  const day = iso.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function hasActiveOrgFilters(org: DashboardOrgFilters) {
  return Boolean(
    org.department ||
      org.partner ||
      org.service ||
      org.businessManager ||
      org.jobManager ||
      org.company ||
      org.respondent
  );
}

function companyOf(item: OrgFilterable) {
  return item.company ?? item.client?.company ?? null;
}

function respondentOf(item: OrgFilterable) {
  return item.customerName ?? item.client?.name ?? null;
}

function matchesSelected(
  stored: string | null | undefined,
  selected: string
) {
  if (!selected) return true;
  return orgLabelsMatch(stored, selected);
}

export function matchesOrgFilters(item: OrgFilterable, org: DashboardOrgFilters) {
  if (!hasActiveOrgFilters(org)) return true;

  const hasAnyValue = Boolean(
    item.department?.trim() ||
      item.partner?.trim() ||
      item.serviceName?.trim() ||
      item.businessManagerName?.trim() ||
      item.jobManagerName?.trim() ||
      companyOf(item)?.trim() ||
      respondentOf(item)?.trim()
  );
  if (!hasAnyValue) return false;
  if (!matchesSelected(item.department, org.department)) return false;
  if (!matchesSelected(item.partner, org.partner)) return false;
  if (!matchesSelected(item.serviceName, org.service)) return false;
  if (!matchesSelected(item.businessManagerName, org.businessManager)) return false;
  if (!matchesSelected(item.jobManagerName, org.jobManager)) return false;
  if (!matchesSelected(companyOf(item), org.company)) return false;
  if (!matchesSelected(respondentOf(item), org.respondent)) return false;
  return true;
}

function uniqueLabels(values: Array<string | null | undefined>) {
  const seen = new Map<string, string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function collectInviteFilterOptions(
  records: OrgFilterable[]
): InviteFilterOptions {
  return {
    departments: uniqueLabels(records.map((record) => record.department)),
    partners: uniqueLabels(records.map((record) => record.partner)),
    services: uniqueLabels(records.map((record) => record.serviceName)),
    businessManagers: uniqueLabels(records.map((record) => record.businessManagerName)),
    jobManagers: uniqueLabels(records.map((record) => record.jobManagerName)),
    companies: uniqueLabels(records.map((record) => companyOf(record))),
    respondents: uniqueLabels(records.map((record) => respondentOf(record))),
  };
}

export function filterDashboardInsights<
  T extends OrgFilterable & { submittedAt: string },
>(items: T[], window: DashboardWindow, org: DashboardOrgFilters): T[] {
  return items.filter(
    (item) =>
      withinDashboardWindow(item.submittedAt, window) &&
      withinCalendarRange(item.submittedAt, org.dateFrom, org.dateTo) &&
      matchesOrgFilters(item, org)
  );
}

export function filterInviteRecordsForReporting(
  invites: SurveyInviteRecord[],
  window: DashboardWindow,
  org: DashboardOrgFilters
): SurveyInviteRecord[] {
  return invites.filter(
    (invite) =>
      Boolean(invite.sentAt && withinDashboardWindow(invite.sentAt, window)) &&
      withinCalendarRange(invite.sentAt, org.dateFrom, org.dateTo) &&
      matchesOrgFilters(invite, org)
  );
}

export function dashboardOrgFilterLabel(org: DashboardOrgFilters) {
  const parts: string[] = [];
  if (org.department) parts.push(org.department);
  if (org.service) parts.push(org.service);
  if (org.partner) parts.push(org.partner);
  if (org.businessManager) parts.push(org.businessManager);
  if (org.jobManager) parts.push(org.jobManager);
  return parts.join(" · ");
}
