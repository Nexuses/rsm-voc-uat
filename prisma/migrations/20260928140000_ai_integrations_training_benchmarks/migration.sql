-- Additive only: AI logging/artifacts, integrations, webhook log, training, benchmarks.

-- CreateTable
CREATE TABLE "AiInteraction" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sourceIds" TEXT[],
    "toolCalls" TEXT[],
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiArtifact" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "sourceIds" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdByType" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationCredential" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "keyPrefix" TEXT,
    "keyHash" TEXT,
    "encryptedSecret" TEXT,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT,
    "dedupeKey" TEXT,
    "signatureValid" BOOLEAN NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCourse" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "externalUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'shadow',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAssignment" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "ruleId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "sourceResponseIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benchmark" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "dimensionKey" TEXT NOT NULL DEFAULT '',
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER,
    "population" TEXT,
    "source" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Benchmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiInteraction_purpose_createdAt_idx" ON "AiInteraction"("purpose", "createdAt");

-- CreateIndex
CREATE INDEX "AiInteraction_actorUserId_createdAt_idx" ON "AiInteraction"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AiArtifact_scopeType_scopeId_createdAt_idx" ON "AiArtifact"("scopeType", "scopeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_kind_vendor_key" ON "Integration"("kind", "vendor");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredential_keyHash_key" ON "IntegrationCredential"("keyHash");

-- CreateIndex
CREATE INDEX "IntegrationCredential_integrationId_idx" ON "IntegrationCredential"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_dedupeKey_key" ON "WebhookEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "WebhookEvent_source_receivedAt_idx" ON "WebhookEvent"("source", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCourse_key_key" ON "TrainingCourse"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingRule_key_key" ON "TrainingRule"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingAssignment_dedupeKey_key" ON "TrainingAssignment"("dedupeKey");

-- CreateIndex
CREATE INDEX "TrainingAssignment_employeeId_status_idx" ON "TrainingAssignment"("employeeId", "status");

-- CreateIndex
CREATE INDEX "Benchmark_metric_periodEnd_idx" ON "Benchmark"("metric", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Benchmark_scope_dimension_dimensionKey_metric_periodStart_p_key" ON "Benchmark"("scope", "dimension", "dimensionKey", "metric", "periodStart", "periodEnd", "source");

-- AddForeignKey
ALTER TABLE "IntegrationCredential" ADD CONSTRAINT "IntegrationCredential_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "TrainingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Vector search index for Ask Your Data. HNSW needs pgvector >= 0.5; skip
-- quietly on older installs so the deploy never fails on this optimization.
DO $$
DECLARE
  v text;
BEGIN
  SELECT extversion INTO v FROM pg_extension WHERE extname = 'vector';
  IF v IS NOT NULL AND string_to_array(v, '.')::int[] >= ARRAY[0,5] THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "ResponseEmbedding_embedding_hnsw_idx" ON "ResponseEmbedding" USING hnsw ("embedding" vector_cosine_ops)';
  END IF;
END $$;
