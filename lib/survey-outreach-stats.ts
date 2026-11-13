import type { DashboardWindow } from "@/lib/dashboard-analytics";
import {
  buildSurveyOutreachStats,
  type SurveyInviteRecord,
  type SurveyOutreachStats,
} from "@/lib/survey-outreach";

export type { SurveyInviteRecord, SurveyOutreachStats };

export function buildOutreachStatsForWindow(
  invites: SurveyInviteRecord[],
  window: DashboardWindow
): SurveyOutreachStats {
  return buildSurveyOutreachStats(invites, window);
}
