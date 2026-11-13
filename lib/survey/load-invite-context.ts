import { db } from "@/lib/db";
import {
  emptySurveyInviteContext,
  inviteContextFromInvite,
  type SurveyInviteContext,
} from "@/lib/survey/invite-context";

export async function loadSurveyInviteContext(
  token: string | null | undefined
): Promise<SurveyInviteContext> {
  const trimmed = token?.trim();
  if (!trimmed) return emptySurveyInviteContext();

  const invite = await db.surveyInvite.findUnique({
    where: { token: trimmed },
    select: {
      customerName: true,
      firstName: true,
      lastName: true,
      email: true,
      company: true,
      designation: true,
    },
  });

  if (!invite) return emptySurveyInviteContext();
  return inviteContextFromInvite(invite);
}
