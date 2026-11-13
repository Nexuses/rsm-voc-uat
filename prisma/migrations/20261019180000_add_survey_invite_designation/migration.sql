-- Optional client designation/position captured at invite send for survey prefill.
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "designation" TEXT;
