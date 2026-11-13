-- AlterTable
ALTER TABLE "SurveyInvite" ADD COLUMN "followupCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "SurveyInvite"
SET "followupCount" = CASE
  WHEN "followup2SentAt" IS NOT NULL THEN 2
  WHEN "followup1SentAt" IS NOT NULL THEN 1
  ELSE 0
END;

-- CreateTable
CREATE TABLE "SurveyInviteEvent" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "templateId" TEXT,
    "message" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyInviteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurveyInviteEvent_inviteId_createdAt_idx" ON "SurveyInviteEvent"("inviteId", "createdAt");

-- AddForeignKey
ALTER TABLE "SurveyInviteEvent" ADD CONSTRAINT "SurveyInviteEvent_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "SurveyInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "SurveyInviteEvent" ("id", "inviteId", "type", "templateId", "createdAt")
SELECT "id" || '-invite_sent', "id", 'invite_sent', 'invite', "sentAt"
FROM "SurveyInvite"
WHERE "sentAt" IS NOT NULL;

INSERT INTO "SurveyInviteEvent" ("id", "inviteId", "type", "templateId", "createdAt")
SELECT "id" || '-followup1', "id", 'followup_auto', 'followup-day3', "followup1SentAt"
FROM "SurveyInvite"
WHERE "followup1SentAt" IS NOT NULL;

INSERT INTO "SurveyInviteEvent" ("id", "inviteId", "type", "templateId", "createdAt")
SELECT "id" || '-followup2', "id", 'followup_auto', 'followup-day3', "followup2SentAt"
FROM "SurveyInvite"
WHERE "followup2SentAt" IS NOT NULL;

INSERT INTO "SurveyInviteEvent" ("id", "inviteId", "type", "createdAt")
SELECT "id" || '-thank_you', "id", 'thank_you', "thankYouSentAt"
FROM "SurveyInvite"
WHERE "thankYouSentAt" IS NOT NULL;

INSERT INTO "SurveyInviteEvent" ("id", "inviteId", "type", "createdAt")
SELECT "id" || '-opened', "id", 'opened', "openedAt"
FROM "SurveyInvite"
WHERE "openedAt" IS NOT NULL;

INSERT INTO "SurveyInviteEvent" ("id", "inviteId", "type", "createdAt")
SELECT "id" || '-started', "id", 'started', "startedAt"
FROM "SurveyInvite"
WHERE "startedAt" IS NOT NULL;

INSERT INTO "SurveyInviteEvent" ("id", "inviteId", "type", "createdAt")
SELECT "id" || '-completed', "id", 'completed', "completedAt"
FROM "SurveyInvite"
WHERE "completedAt" IS NOT NULL;
