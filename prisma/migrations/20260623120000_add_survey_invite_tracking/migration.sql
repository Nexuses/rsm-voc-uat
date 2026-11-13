-- CreateTable
CREATE TABLE "SurveyInvite" (
    "id" TEXT NOT NULL,
    "batchId" TEXT,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "conversationId" TEXT,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "responseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyInvite_token_key" ON "SurveyInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyInvite_conversationId_key" ON "SurveyInvite"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyInvite_responseId_key" ON "SurveyInvite"("responseId");

-- CreateIndex
CREATE INDEX "SurveyInvite_batchId_idx" ON "SurveyInvite"("batchId");

-- CreateIndex
CREATE INDEX "SurveyInvite_sentAt_idx" ON "SurveyInvite"("sentAt");

-- CreateIndex
CREATE INDEX "SurveyInvite_email_idx" ON "SurveyInvite"("email");

-- AddForeignKey
ALTER TABLE "SurveyInvite" ADD CONSTRAINT "SurveyInvite_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE SET NULL ON UPDATE CASCADE;
