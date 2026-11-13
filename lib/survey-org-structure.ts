export const SURVEY_PARTNERS_BY_DEPARTMENT = {
  ASSURANCE: [
    "Sriram Gopalakrishnan",
    "Firas Georges",
    "Ahmed Abd Ellatif",
    "MS Mathew",
    "Mohamed Shehata",
  ],
  TAX: ["Tuhin Chaturvedi", "Ravi Kumar", "Walaa El Attar"],
  "RISK ADVISORY": ["Mohamed Osama"],
  "CYBERSECURITY / IT RISK": ["Bhaskar Maheshwari"],
  "ESG / SUSTAINABILITY": ["Kareem Abu Eid"],
  "CORPORATE FINANCE": ["Suvrat Mehta"],
  "CX CONSULTING": ["Ahmed Al Ameer"],
} as const;

export type SurveyDepartment = keyof typeof SURVEY_PARTNERS_BY_DEPARTMENT;

export const SURVEY_DEPARTMENTS = Object.keys(
  SURVEY_PARTNERS_BY_DEPARTMENT
) as SurveyDepartment[];

export function normalizeOrgLabel(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function orgLabelsMatch(
  stored: string | null | undefined,
  selected: string | null | undefined
) {
  const normalizedStored = normalizeOrgLabel(stored);
  const normalizedSelected = normalizeOrgLabel(selected);
  if (!normalizedStored || !normalizedSelected) return false;
  return normalizedStored === normalizedSelected;
}

export function matchesDepartmentFilter(
  stored: string | null | undefined,
  selected: string
) {
  if (!selected) return true;
  return orgLabelsMatch(stored, selected);
}

export function matchesPartnerFilter(
  stored: string | null | undefined,
  selected: string
) {
  if (!selected) return true;
  return orgLabelsMatch(stored, selected);
}

export function allSurveyPartners(): string[] {
  return Array.from(
    new Set(
      SURVEY_DEPARTMENTS.flatMap(
        (department) => SURVEY_PARTNERS_BY_DEPARTMENT[department]
      )
    )
  ).sort((a, b) => a.localeCompare(b));
}

export function partnersForDepartment(department: string): string[] {
  if (!department) return allSurveyPartners();
  const match = SURVEY_DEPARTMENTS.find((entry) =>
    orgLabelsMatch(entry, department)
  );
  if (!match) return [];
  return [...SURVEY_PARTNERS_BY_DEPARTMENT[match]];
}

export function hasActiveOrgFilters(org: {
  department: string;
  partner: string;
}) {
  return Boolean(org.department || org.partner);
}
