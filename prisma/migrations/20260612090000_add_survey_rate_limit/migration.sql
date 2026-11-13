-- CreateTable
CREATE TABLE "SurveyRateLimit" (
    "id" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyRateLimit_digest_action_windowStart_key"
ON "SurveyRateLimit"("digest", "action", "windowStart");

-- CreateIndex
CREATE INDEX "SurveyRateLimit_windowStart_idx"
ON "SurveyRateLimit"("windowStart");
