import type { SurveyInviteTrackerStatus } from "@/lib/survey-invite-tracking";

export type InviteTrackerStatusFilter =
  | ""
  | "sent"
  | "opened"
  | "started"
  | "completed"
  | "not_completed";

export function matchesInviteTrackerStatus(
  status: SurveyInviteTrackerStatus,
  selected: InviteTrackerStatusFilter
) {
  if (!selected) return true;
  if (selected === "not_completed") return status !== "completed";
  if (selected === "sent") return status === "sent" || status === "reminder_sent";
  return status === selected;
}
