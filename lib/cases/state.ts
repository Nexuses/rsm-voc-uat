export const CASE_STATUSES = [
  "new",
  "triaged",
  "in_progress",
  "awaiting_client",
  "resolved",
  "closed",
  "reopened",
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type CaseSeverity = (typeof CASE_SEVERITIES)[number];

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  new: "New",
  triaged: "Triaged",
  in_progress: "In progress",
  awaiting_client: "Awaiting client",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
};

const TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  new: ["triaged", "in_progress", "closed"],
  triaged: ["in_progress", "closed"],
  in_progress: ["awaiting_client", "resolved"],
  awaiting_client: ["in_progress", "resolved"],
  resolved: ["closed", "reopened"],
  closed: ["reopened"],
  reopened: ["in_progress", "resolved"],
};

export const OPEN_CASE_STATUSES: CaseStatus[] = [
  "new",
  "triaged",
  "in_progress",
  "awaiting_client",
  "reopened",
];

/** Escalations Kanban columns (closed stays off the board). */
export const BOARD_CASE_STATUSES: CaseStatus[] = [
  "new",
  "triaged",
  "in_progress",
  "awaiting_client",
  "resolved",
  "reopened",
];

export function isCaseStatus(value: string): value is CaseStatus {
  return (CASE_STATUSES as readonly string[]).includes(value);
}

export function allowedTransitions(from: string): CaseStatus[] {
  return isCaseStatus(from) ? TRANSITIONS[from] : [];
}

export function canTransition(from: string, to: string) {
  return isCaseStatus(to) && allowedTransitions(from).includes(to);
}

/**
 * Resolved cases that need client sign-off cannot close until it is recorded.
 * Untouched cases (new/triaged) may still be dismissed.
 */
export function closeBlockedReason(input: {
  from: string;
  to: string;
  requiresClientConfirmation: boolean;
  clientConfirmedAt: Date | string | null;
}): string | null {
  if (input.to !== "closed" || input.from !== "resolved") return null;
  if (!input.requiresClientConfirmation || input.clientConfirmedAt) return null;
  return "Record the client's confirmation before closing this case";
}

/** Two or more low metrics on one response is treated as more urgent. */
export function severityForAttentionMetrics(metrics: string[]): CaseSeverity {
  return metrics.length >= 2 ? "high" : "medium";
}
