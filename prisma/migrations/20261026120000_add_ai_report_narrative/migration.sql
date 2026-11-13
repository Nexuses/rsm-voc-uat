-- CreateTable
CREATE TABLE "AiReportNarrative" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "filtersJson" JSONB NOT NULL,
    "statsJson" JSONB NOT NULL,
    "narrativeJson" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiReportNarrative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiReportNarrative_periodStart_periodEnd_createdAt_idx" ON "AiReportNarrative"("periodStart", "periodEnd", "createdAt");

-- CreateIndex
CREATE INDEX "AiReportNarrative_createdAt_idx" ON "AiReportNarrative"("createdAt");
