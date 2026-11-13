import { normalizeAccountName } from "@/lib/domain/accounts";
import {
  normalizeOrgLabel,
  SURVEY_DEPARTMENTS,
  SURVEY_PARTNERS_BY_DEPARTMENT,
} from "@/lib/survey-org-structure";

export const DEFAULT_ORGANIZATION_ID = "org_default";

export function normalizePersonName(value: string | null | undefined) {
  return normalizeOrgLabel(value).replace(/\s+/g, " ");
}

/** Service lines and partner employees come from the approved org structure. */
export function plannedServiceLines() {
  return SURVEY_DEPARTMENTS.map((code) => ({ code, name: code }));
}

export function plannedEmployees() {
  return SURVEY_DEPARTMENTS.flatMap((department) =>
    SURVEY_PARTNERS_BY_DEPARTMENT[department].map((name) => ({
      name,
      normalizedName: normalizePersonName(name),
      serviceLineCode: department,
      level: "partner",
    }))
  );
}

/**
 * Groups free-text company names into accounts. The display name is the most
 * frequent original spelling; ties keep the first seen.
 */
export function planAccounts(companies: Array<string | null | undefined>) {
  const groups = new Map<string, Map<string, number>>();
  for (const company of companies) {
    const original = company?.trim();
    if (!original) continue;
    const key = normalizeAccountName(original);
    if (!key) continue;
    const spellings = groups.get(key) ?? new Map<string, number>();
    spellings.set(original, (spellings.get(original) ?? 0) + 1);
    groups.set(key, spellings);
  }
  return [...groups.entries()].map(([normalizedName, spellings]) => {
    let name = "";
    let best = 0;
    for (const [spelling, count] of spellings) {
      if (count > best) {
        name = spelling;
        best = count;
      }
    }
    return { normalizedName, name };
  });
}

export function serviceLineCodeFor(department: string | null | undefined) {
  const normalized = normalizeOrgLabel(department);
  if (!normalized) return null;
  return SURVEY_DEPARTMENTS.find((code) => normalizeOrgLabel(code) === normalized) ?? null;
}
