-- AlterTable
ALTER TABLE "SurveyInvite"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "company" TEXT,
ADD COLUMN "followup1SentAt" TIMESTAMP(3),
ADD COLUMN "followup2SentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "SurveyInvite_followup1SentAt_idx" ON "SurveyInvite"("followup1SentAt");

-- CreateIndex
CREATE INDEX "SurveyInvite_followup2SentAt_idx" ON "SurveyInvite"("followup2SentAt");
