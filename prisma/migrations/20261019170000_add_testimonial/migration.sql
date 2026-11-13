-- Client-approved testimonials collected from Positive survey thank-you emails.
CREATE TABLE IF NOT EXISTS "Testimonial" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "surveyInviteId" TEXT,
    "token" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'survey_thankyou',
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "sourceComments" TEXT NOT NULL DEFAULT '',
    "aiDraft" TEXT,
    "clientText" TEXT,
    "videoUrl" TEXT,
    "consentName" BOOLEAN,
    "consentWebsite" BOOLEAN,
    "consentSocial" BOOLEAN,
    "consentedAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Testimonial_responseId_key" ON "Testimonial"("responseId");
CREATE UNIQUE INDEX IF NOT EXISTS "Testimonial_token_key" ON "Testimonial"("token");
CREATE INDEX IF NOT EXISTS "Testimonial_status_createdAt_idx" ON "Testimonial"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Testimonial_surveyInviteId_idx" ON "Testimonial"("surveyInviteId");

DO $$ BEGIN
  ALTER TABLE "Testimonial"
    ADD CONSTRAINT "Testimonial_responseId_fkey"
    FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Testimonial"
    ADD CONSTRAINT "Testimonial_surveyInviteId_fkey"
    FOREIGN KEY ("surveyInviteId") REFERENCES "SurveyInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
