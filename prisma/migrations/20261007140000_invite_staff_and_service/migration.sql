-- Free-text engagement people and service on each invite, plus an internal staff master.
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "partnerEmail" TEXT;
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "businessManagerName" TEXT;
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "businessManagerEmail" TEXT;
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "jobManagerName" TEXT;
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "jobManagerEmail" TEXT;
ALTER TABLE "SurveyInvite" ADD COLUMN IF NOT EXISTS "serviceName" TEXT;

CREATE TABLE IF NOT EXISTS "StaffContact" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StaffContact_role_nameKey_key" ON "StaffContact"("role", "nameKey");
CREATE INDEX IF NOT EXISTS "StaffContact_role_idx" ON "StaffContact"("role");

-- Seed current partner names so invite suggestions are not empty. Emails stay blank
-- until an invite supplies one.
INSERT INTO "StaffContact" ("id", "role", "name", "nameKey", "createdAt", "updatedAt")
VALUES
  ('8f0a1c10-0001-4000-8000-000000000001', 'partner', 'Sriram Gopalakrishnan', 'sriram gopalakrishnan', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0001-4000-8000-000000000002', 'partner', 'Firas Georges', 'firas georges', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0001-4000-8000-000000000003', 'partner', 'Ahmed Abd Ellatif', 'ahmed abd ellatif', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0001-4000-8000-000000000004', 'partner', 'MS Mathew', 'ms mathew', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0001-4000-8000-000000000005', 'partner', 'Mohamed Shehata', 'mohamed shehata', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0001-4000-8000-000000000006', 'partner', 'Tuhin Chaturvedi', 'tuhin chaturvedi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0001-4000-8000-000000000007', 'partner', 'Ravi Kumar', 'ravi kumar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0001-4000-8000-000000000008', 'partner', 'Walaa El Attar', 'walaa el attar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0001-4000-8000-000000000009', 'partner', 'Mohamed Osama', 'mohamed osama', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0001-4000-8000-000000000010', 'partner', 'Bhaskar Maheshwari', 'bhaskar maheshwari', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0001-4000-8000-000000000011', 'partner', 'Kareem Abu Eid', 'kareem abu eid', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0001-4000-8000-000000000012', 'partner', 'Suvrat Mehta', 'suvrat mehta', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0001-4000-8000-000000000013', 'partner', 'Ahmed Al Ameer', 'ahmed al ameer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("role", "nameKey") DO NOTHING;
