-- CRM invite correlation + result links
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "externalEngagementId" TEXT;
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "triggerStage" TEXT;
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "resultToken" TEXT;

UPDATE "SurveyInvite"
SET "resultToken" = replace(
  replace(
    replace(
      encode(sha256((id || random()::text || clock_timestamp()::text)::bytea), 'base64'),
      '+',
      '-'
    ),
    '/',
    '_'
  ),
  '=',
  ''
)
WHERE "resultToken" IS NULL;

ALTER TABLE "SurveyInvite" ALTER COLUMN "resultToken" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SurveyInvite_idempotencyKey_key" ON "SurveyInvite"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "SurveyInvite_resultToken_key" ON "SurveyInvite"("resultToken");
CREATE INDEX IF NOT EXISTS "SurveyInvite_externalEngagementId_idx" ON "SurveyInvite"("externalEngagementId");

-- CRM webhook delivery log
CREATE TABLE IF NOT EXISTS "CrmWebhookDelivery" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "success" BOOLEAN NOT NULL,
    "httpStatus" INTEGER,
    "error" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmWebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CrmWebhookDelivery_inviteId_idx" ON "CrmWebhookDelivery"("inviteId");
CREATE INDEX IF NOT EXISTS "CrmWebhookDelivery_createdAt_idx" ON "CrmWebhookDelivery"("createdAt");

ALTER TABLE "CrmWebhookDelivery"
  DROP CONSTRAINT IF EXISTS "CrmWebhookDelivery_inviteId_fkey";
ALTER TABLE "CrmWebhookDelivery"
  ADD CONSTRAINT "CrmWebhookDelivery_inviteId_fkey"
  FOREIGN KEY ("inviteId") REFERENCES "SurveyInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Audit log
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipDigest" TEXT,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_occurredAt_idx" ON "AuditLog"("occurredAt");
CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");

-- Roles and permissions
CREATE TABLE IF NOT EXISTS "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Role_slug_key" ON "Role"("slug");

CREATE TABLE IF NOT EXISTS "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_roleId_permission_key" ON "RolePermission"("roleId", "permission");
CREATE INDEX IF NOT EXISTS "RolePermission_permission_idx" ON "RolePermission"("permission");

ALTER TABLE "RolePermission"
  DROP CONSTRAINT IF EXISTS "RolePermission_roleId_fkey";
ALTER TABLE "RolePermission"
  ADD CONSTRAINT "RolePermission_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roleId" TEXT;

ALTER TABLE "User"
  DROP CONSTRAINT IF EXISTS "User_roleId_fkey";
ALTER TABLE "User"
  ADD CONSTRAINT "User_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
