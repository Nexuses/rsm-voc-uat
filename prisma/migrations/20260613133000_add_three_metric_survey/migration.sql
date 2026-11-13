ALTER TABLE "Client"
ADD COLUMN "designation" TEXT;

ALTER TABLE "Response"
ADD COLUMN "surveyVersion" TEXT NOT NULL DEFAULT 'legacy-v1',
ADD COLUMN "csatScore" DOUBLE PRECISION,
ADD COLUMN "cesScore" DOUBLE PRECISION,
ADD COLUMN "npsScore" DOUBLE PRECISION;

UPDATE "Response"
SET "csatScore" = COALESCE(
  CASE
    WHEN jsonb_typeof("answers") = 'array'
      AND jsonb_array_length("answers") > 0
      AND ("answers"->0->>'rating') ~ '^[0-9]+(\.[0-9]+)?$'
    THEN ("answers"->0->>'rating')::DOUBLE PRECISION
    ELSE NULL
  END,
  "avgRating"
)
WHERE "csatScore" IS NULL;

UPDATE "Response"
SET "avgRating" = "csatScore"
WHERE "csatScore" IS NOT NULL;

ALTER TABLE "CsatSnapshot"
ADD COLUMN "csatFavorablePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "cesAverage" DOUBLE PRECISION,
ADD COLUMN "cesFavorablePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "cesResponseCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cesDistribution" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "npsScore" DOUBLE PRECISION,
ADD COLUMN "npsResponseCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "npsDistribution" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "promoterPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "passivePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "detractorPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "totalResponseCount" INTEGER NOT NULL DEFAULT 0;
