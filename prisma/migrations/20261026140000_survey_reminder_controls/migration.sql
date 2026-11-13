-- NEX-919: reminder stop/re-enable, last reminder, config, contact stops

ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "lastReminderSentAt" TIMESTAMP(3);
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "reminderCycleStartedAt" TIMESTAMP(3);
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "remindersStoppedAt" TIMESTAMP(3);
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "remindersStoppedByUserId" TEXT;
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "remindersStopReason" TEXT;

CREATE INDEX IF NOT EXISTS "SurveyInvite_remindersStoppedAt_idx" ON "SurveyInvite"("remindersStoppedAt");
CREATE INDEX IF NOT EXISTS "SurveyInvite_lastReminderSentAt_idx" ON "SurveyInvite"("lastReminderSentAt");

CREATE TABLE IF NOT EXISTS "SurveyReminderConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "intervalDays" INTEGER NOT NULL DEFAULT 3,
    "maxCount" INTEGER NOT NULL DEFAULT 5,
    "ccEmails" TEXT,
    "maxAutoSendsPerRun" INTEGER NOT NULL DEFAULT 25,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "SurveyReminderConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SurveyReminderConfig" ("id", "intervalDays", "maxCount", "ccEmails", "maxAutoSendsPerRun", "updatedAt")
VALUES ('default', 3, 5, NULL, 25, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "SurveyReminderContactStop" (
    "id" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "stoppedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stoppedByUserId" TEXT,
    "stopReason" TEXT,
    "clearedAt" TIMESTAMP(3),
    "clearedByUserId" TEXT,

    CONSTRAINT "SurveyReminderContactStop_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SurveyReminderContactStop_emailNormalized_key"
  ON "SurveyReminderContactStop"("emailNormalized");
CREATE INDEX IF NOT EXISTS "SurveyReminderContactStop_emailNormalized_clearedAt_idx"
  ON "SurveyReminderContactStop"("emailNormalized", "clearedAt");

UPDATE "SurveyInvite"
SET "lastReminderSentAt" = COALESCE("followup2SentAt", "followup1SentAt")
WHERE "lastReminderSentAt" IS NULL
  AND ("followup1SentAt" IS NOT NULL OR "followup2SentAt" IS NOT NULL);
