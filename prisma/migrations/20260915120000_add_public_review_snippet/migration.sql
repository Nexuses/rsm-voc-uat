-- CreateTable
CREATE TABLE "PublicReviewSnippet" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "comment" TEXT NOT NULL,
    "csatScore" DOUBLE PRECISION,
    "cesScore" DOUBLE PRECISION,
    "npsScore" DOUBLE PRECISION,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicReviewSnippet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicReviewSnippet_sourceKey_key" ON "PublicReviewSnippet"("sourceKey");

-- CreateIndex
CREATE INDEX "PublicReviewSnippet_completedAt_idx" ON "PublicReviewSnippet"("completedAt");
