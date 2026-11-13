import { db } from "@/lib/db";
import { getTeamNotifyRecipients } from "@/lib/survey-thankyou-email";
import {
  SURVEY_FOLLOWUP_DEFAULT_MAX_PER_RUN,
  SURVEY_FOLLOWUP_INTERVAL_DAYS,
  SURVEY_FOLLOWUP_MAX_COUNT,
  buildFollowupScheduleDays,
} from "@/lib/survey-followup-cadence";

export type SurveyReminderSettings = {
  intervalDays: number;
  maxCount: number;
  ccEmails: string[];
  maxAutoSendsPerRun: number;
  scheduleDays: number[];
};

function parseCcList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function clampPositiveInt(value: number, fallback: number, max = 90) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(value)));
}

export function reminderCcFromEnv(): string[] {
  const dedicated = process.env.SURVEY_REMINDER_CC_TO?.trim();
  if (dedicated) return parseCcList(dedicated);
  return getTeamNotifyRecipients();
}

export async function getSurveyReminderSettings(): Promise<SurveyReminderSettings> {
  const row = await db.surveyReminderConfig.findUnique({
    where: { id: "default" },
  });

  const intervalDays = clampPositiveInt(
    row?.intervalDays ?? SURVEY_FOLLOWUP_INTERVAL_DAYS,
    SURVEY_FOLLOWUP_INTERVAL_DAYS,
    30
  );
  const maxCount = clampPositiveInt(
    row?.maxCount ?? SURVEY_FOLLOWUP_MAX_COUNT,
    SURVEY_FOLLOWUP_MAX_COUNT,
    20
  );
  const maxAutoSendsPerRun = clampPositiveInt(
    row?.maxAutoSendsPerRun ?? SURVEY_FOLLOWUP_DEFAULT_MAX_PER_RUN,
    SURVEY_FOLLOWUP_DEFAULT_MAX_PER_RUN,
    500
  );

  const ccFromDb = parseCcList(row?.ccEmails);
  const ccEmails = ccFromDb.length ? ccFromDb : reminderCcFromEnv();

  return {
    intervalDays,
    maxCount,
    ccEmails,
    maxAutoSendsPerRun,
    scheduleDays: buildFollowupScheduleDays(intervalDays, maxCount),
  };
}

export async function updateSurveyReminderSettings(input: {
  intervalDays: number;
  maxCount: number;
  ccEmails: string;
  maxAutoSendsPerRun: number;
  updatedByUserId?: string | null;
}): Promise<SurveyReminderSettings> {
  const intervalDays = clampPositiveInt(input.intervalDays, SURVEY_FOLLOWUP_INTERVAL_DAYS, 30);
  const maxCount = clampPositiveInt(input.maxCount, SURVEY_FOLLOWUP_MAX_COUNT, 20);
  const maxAutoSendsPerRun = clampPositiveInt(
    input.maxAutoSendsPerRun,
    SURVEY_FOLLOWUP_DEFAULT_MAX_PER_RUN,
    500
  );
  const ccEmails = parseCcList(input.ccEmails).join(", ") || null;

  await db.surveyReminderConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      intervalDays,
      maxCount,
      ccEmails,
      maxAutoSendsPerRun,
      updatedByUserId: input.updatedByUserId ?? null,
    },
    update: {
      intervalDays,
      maxCount,
      ccEmails,
      maxAutoSendsPerRun,
      updatedByUserId: input.updatedByUserId ?? null,
    },
  });

  return getSurveyReminderSettings();
}
