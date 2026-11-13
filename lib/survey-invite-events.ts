import { db } from "@/lib/db";

export type SurveyInviteActivityType =
  | "invite_sent"
  | "followup_auto"
  | "followup_manual"
  | "reminders_stopped"
  | "reminders_reenabled"
  | "note"
  | "thank_you"
  | "opened"
  | "started"
  | "completed"
  | "failed";

export type SurveyInviteActivityEvent = {
  id: string;
  type: SurveyInviteActivityType;
  templateId: string | null;
  message: string | null;
  actorUserId: string | null;
  createdAt: string;
};

export const SURVEY_INVITE_ACTIVITY_LABELS: Record<
  SurveyInviteActivityType,
  string
> = {
  invite_sent: "Invitation sent",
  followup_auto: "Automatic reminder sent",
  followup_manual: "Manual follow-up sent",
  reminders_stopped: "Reminders stopped",
  reminders_reenabled: "Reminders re-enabled",
  note: "Note",
  thank_you: "Thank-you email sent",
  opened: "Survey opened",
  started: "Survey started",
  completed: "Survey completed",
  failed: "Send failed",
};

export function toSurveyInviteActivityEvent(event: {
  id: string;
  type: string;
  templateId: string | null;
  message: string | null;
  actorUserId: string | null;
  createdAt: Date;
}): SurveyInviteActivityEvent {
  return {
    id: event.id,
    type: event.type as SurveyInviteActivityType,
    templateId: event.templateId,
    message: event.message,
    actorUserId: event.actorUserId,
    createdAt: event.createdAt.toISOString(),
  };
}

export async function recordSurveyInviteActivity(input: {
  inviteId: string;
  type: SurveyInviteActivityType;
  templateId?: string | null;
  message?: string | null;
  actorUserId?: string | null;
  createdAt?: Date;
}) {
  try {
    const event = await db.surveyInviteEvent.create({
      data: {
        inviteId: input.inviteId,
        type: input.type,
        templateId: input.templateId ?? null,
        message: input.message ?? null,
        actorUserId: input.actorUserId ?? null,
        createdAt: input.createdAt,
      },
    });
    if (!event?.id) return null;
    return toSurveyInviteActivityEvent(event);
  } catch (error) {
    console.error("survey invite activity log failed", error);
    return null;
  }
}
