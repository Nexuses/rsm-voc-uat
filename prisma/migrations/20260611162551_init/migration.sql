-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "tier" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "clientId" TEXT,
    "language" TEXT,
    "avgRating" DOUBLE PRECISION,
    "answers" JSONB NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseInsight" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "overallSentiment" TEXT NOT NULL,
    "satisfactionSummary" TEXT NOT NULL,
    "keyDrivers" JSONB NOT NULL,
    "riskSignals" JSONB NOT NULL,
    "suggestedReply" JSONB NOT NULL,
    "nextSteps" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResponseInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseEmbedding" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResponseEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsatSnapshot" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "avgRating" DOUBLE PRECISION NOT NULL,
    "responseCount" INTEGER NOT NULL,
    "distribution" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CsatSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeRollup" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "themeLabel" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "mentionCount" INTEGER NOT NULL,
    "publicSummary" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThemeRollup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'cx',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Response_conversationId_key" ON "Response"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "ResponseInsight_responseId_key" ON "ResponseInsight"("responseId");

-- CreateIndex
CREATE UNIQUE INDEX "ResponseEmbedding_responseId_key" ON "ResponseEmbedding"("responseId");

-- CreateIndex
CREATE UNIQUE INDEX "CsatSnapshot_period_key" ON "CsatSnapshot"("period");

-- CreateIndex
CREATE INDEX "ThemeRollup_period_idx" ON "ThemeRollup"("period");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseInsight" ADD CONSTRAINT "ResponseInsight_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseEmbedding" ADD CONSTRAINT "ResponseEmbedding_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;
