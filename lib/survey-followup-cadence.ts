export const SURVEY_FOLLOWUP_INTERVAL_DAYS = 3;
/** PDR default (was 4). Overridable via SurveyReminderConfig. */
export const SURVEY_FOLLOWUP_MAX_COUNT = 5;
export const SURVEY_FOLLOWUP_SCHEDULE_DAYS = [3, 6, 9, 12, 15] as const;
export const SURVEY_FOLLOWUP_DEFAULT_MAX_PER_RUN = 200;

/** Kuwait weekend is Friday–Saturday; reminders only Sun–Thu. */
export const SURVEY_REMINDER_TIME_ZONE = "Asia/Kuwait";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type FollowupCadenceOptions = {
  intervalDays?: number;
  maxCount?: number;
};

export type FollowupCadenceSource = {
  sentAt: Date | null;
  reminderCycleStartedAt?: Date | null;
  lastReminderSentAt?: Date | null;
  completedAt?: Date | null;
  responseId?: string | null;
  followupCount?: number | null;
  remindersStoppedAt?: Date | null;
};

export function followupCountFromLegacyTimestamps(invite: {
  followup1SentAt?: Date | null;
  followup2SentAt?: Date | null;
  followupCount?: number | null;
}) {
  if (typeof invite.followupCount === "number") {
    return invite.followupCount;
  }
  if (invite.followup2SentAt) return 2;
  if (invite.followup1SentAt) return 1;
  return 0;
}

export function reminderCycleAnchor(invite: FollowupCadenceSource): Date | null {
  return invite.reminderCycleStartedAt ?? invite.sentAt;
}

export function buildFollowupScheduleDays(
  intervalDays = SURVEY_FOLLOWUP_INTERVAL_DAYS,
  maxCount = SURVEY_FOLLOWUP_MAX_COUNT
): number[] {
  const interval = Math.max(1, Math.floor(intervalDays));
  const max = Math.max(1, Math.floor(maxCount));
  return Array.from({ length: max }, (_, i) => interval * (i + 1));
}

/** Weekday in Kuwait: 0=Sun … 6=Sat (same numbering as Date#getUTCDay). */
export function kuwaitWeekday(date: Date): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: SURVEY_REMINDER_TIME_ZONE,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[label] ?? date.getUTCDay();
}

export function isKuwaitReminderWeekday(date: Date): boolean {
  const day = kuwaitWeekday(date);
  return day >= 0 && day <= 4;
}

/**
 * If `date` falls on Kuwait Fri/Sat, move forward to the next Sunday 08:00 UTC
 * (11:00 Kuwait — same clock as the daily cron). Otherwise return `date` unchanged.
 */
export function bumpToKuwaitReminderWeekday(date: Date): Date {
  if (isKuwaitReminderWeekday(date)) return date;

  const bumped = new Date(date.getTime());
  for (let i = 0; i < 7; i += 1) {
    bumped.setUTCDate(bumped.getUTCDate() + 1);
    if (isKuwaitReminderWeekday(bumped)) {
      // Align to the usual cron instant that day (08:00 UTC).
      return new Date(
        Date.UTC(
          bumped.getUTCFullYear(),
          bumped.getUTCMonth(),
          bumped.getUTCDate(),
          8,
          0,
          0,
          0
        )
      );
    }
  }
  return date;
}

/**
 * Next auto reminder due date.
 * Schedule is invite/cycle-based (day 3, 6, 9…), but after any send we also
 * enforce at least `intervalDays` since `lastReminderSentAt` so a deep backlog
 * cannot burn through reminder #1, #2, #3 on consecutive cron days.
 * Due dates that land on Kuwait Fri/Sat roll forward to the next Sun–Thu.
 */
export function deriveNextFollowUpDate(
  invite: FollowupCadenceSource,
  options: FollowupCadenceOptions = {}
): Date | null {
  if (invite.completedAt || invite.responseId || invite.remindersStoppedAt) {
    return null;
  }

  const anchor = reminderCycleAnchor(invite);
  if (!anchor) return null;

  const maxCount = options.maxCount ?? SURVEY_FOLLOWUP_MAX_COUNT;
  const intervalDays = options.intervalDays ?? SURVEY_FOLLOWUP_INTERVAL_DAYS;
  const count = invite.followupCount ?? 0;
  if (count >= maxCount) return null;

  const scheduleDue = new Date(
    anchor.getTime() + intervalDays * (count + 1) * MS_PER_DAY
  );

  let due = scheduleDue;
  if (invite.lastReminderSentAt) {
    const minGapDue = new Date(
      invite.lastReminderSentAt.getTime() + intervalDays * MS_PER_DAY
    );
    due =
      scheduleDue.getTime() > minGapDue.getTime() ? scheduleDue : minGapDue;
  }

  return bumpToKuwaitReminderWeekday(due);
}

export function isAutoFollowupDue(
  invite: FollowupCadenceSource,
  now = new Date(),
  options: FollowupCadenceOptions = {}
) {
  if (!isKuwaitReminderWeekday(now)) return false;
  const next = deriveNextFollowUpDate(invite, options);
  return Boolean(next && next.getTime() <= now.getTime());
}

export type ReminderLifecycleStatus =
  | "completed"
  | "stopped"
  | "exhausted"
  | "active";

export function deriveReminderLifecycleStatus(
  invite: FollowupCadenceSource & { contactStopped?: boolean },
  options: FollowupCadenceOptions = {}
): ReminderLifecycleStatus {
  if (invite.completedAt || invite.responseId) return "completed";
  if (invite.remindersStoppedAt || invite.contactStopped) return "stopped";
  const maxCount = options.maxCount ?? SURVEY_FOLLOWUP_MAX_COUNT;
  if ((invite.followupCount ?? 0) >= maxCount) return "exhausted";
  return "active";
}
