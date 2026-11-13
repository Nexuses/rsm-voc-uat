-- AlterTable
ALTER TABLE "SurveyInvite" ADD COLUMN "department" TEXT,
ADD COLUMN "partner" TEXT,
ADD COLUMN "teamLeader" TEXT,
ADD COLUMN "customerName" TEXT,
ADD COLUMN "projectId" TEXT,
ADD COLUMN "surveyOrder" TEXT;

CREATE INDEX "SurveyInvite_department_idx" ON "SurveyInvite"("department");
CREATE INDEX "SurveyInvite_partner_idx" ON "SurveyInvite"("partner");
CREATE INDEX "SurveyInvite_teamLeader_idx" ON "SurveyInvite"("teamLeader");
CREATE INDEX "SurveyInvite_projectId_idx" ON "SurveyInvite"("projectId");
CREATE INDEX "SurveyInvite_surveyOrder_idx" ON "SurveyInvite"("surveyOrder");
