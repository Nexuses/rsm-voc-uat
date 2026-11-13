-- Additive only: nullable columns, a defaulted counter, and indexes.

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "publicApprovedAt" TIMESTAMP(3),
ADD COLUMN     "publicHiddenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SurveyInvite" ADD COLUMN     "resultRevokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "after" JSONB,
ADD COLUMN     "before" JSONB,
ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");
