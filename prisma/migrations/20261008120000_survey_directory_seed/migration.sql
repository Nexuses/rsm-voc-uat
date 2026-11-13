-- Seed the survey directory from the current department list and from names
-- already stored on invites. Existing partner rows keep their display name.
-- A blank email is filled from the latest invite that has one for that name.

INSERT INTO "StaffContact" ("id", "role", "name", "nameKey", "createdAt", "updatedAt")
VALUES
  ('8f0a1c10-0002-4000-8000-000000000001', 'department', 'ASSURANCE', 'assurance', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0002-4000-8000-000000000002', 'department', 'TAX', 'tax', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0002-4000-8000-000000000003', 'department', 'RISK ADVISORY', 'risk advisory', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0002-4000-8000-000000000004', 'department', 'CYBERSECURITY / IT RISK', 'cybersecurity / it risk', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0002-4000-8000-000000000005', 'department', 'ESG / SUSTAINABILITY', 'esg / sustainability', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0002-4000-8000-000000000006', 'department', 'CORPORATE FINANCE', 'corporate finance', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8f0a1c10-0002-4000-8000-000000000007', 'department', 'CX CONSULTING', 'cx consulting', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("role", "nameKey") DO NOTHING;

INSERT INTO "StaffContact" ("id", "role", "name", "nameKey", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'department',
  picked.name,
  picked.name_key,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT
    regexp_replace(btrim(department), '\s+', ' ', 'g') AS name,
    lower(regexp_replace(btrim(department), '\s+', ' ', 'g')) AS name_key
  FROM "SurveyInvite"
  WHERE department IS NOT NULL AND btrim(department) <> ''
) picked
ON CONFLICT ("role", "nameKey") DO NOTHING;

INSERT INTO "StaffContact" ("id", "role", "name", "nameKey", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'service',
  picked.name,
  picked.name_key,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT
    regexp_replace(btrim("serviceName"), '\s+', ' ', 'g') AS name,
    lower(regexp_replace(btrim("serviceName"), '\s+', ' ', 'g')) AS name_key
  FROM "SurveyInvite"
  WHERE "serviceName" IS NOT NULL AND btrim("serviceName") <> ''
) picked
ON CONFLICT ("role", "nameKey") DO NOTHING;

INSERT INTO "StaffContact" ("id", "role", "name", "nameKey", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'team_leader',
  picked.name,
  picked.name_key,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT
    regexp_replace(btrim("teamLeader"), '\s+', ' ', 'g') AS name,
    lower(regexp_replace(btrim("teamLeader"), '\s+', ' ', 'g')) AS name_key
  FROM "SurveyInvite"
  WHERE "teamLeader" IS NOT NULL AND btrim("teamLeader") <> ''
) picked
ON CONFLICT ("role", "nameKey") DO NOTHING;

INSERT INTO "StaffContact" ("id", "role", "name", "nameKey", "email", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'partner',
  picked.name,
  picked.name_key,
  picked.email,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (name_key)
    name,
    name_key,
    email
  FROM (
    SELECT
      regexp_replace(btrim(partner), '\s+', ' ', 'g') AS name,
      lower(regexp_replace(btrim(partner), '\s+', ' ', 'g')) AS name_key,
      CASE
        WHEN btrim(COALESCE("partnerEmail", '')) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        THEN btrim("partnerEmail")
        ELSE NULL
      END AS email,
      "sentAt"
    FROM "SurveyInvite"
    WHERE partner IS NOT NULL AND btrim(partner) <> ''
  ) cleaned
  ORDER BY name_key, (email IS NULL), "sentAt" DESC NULLS LAST
) picked
ON CONFLICT ("role", "nameKey") DO UPDATE
SET
  email = COALESCE("StaffContact".email, EXCLUDED.email),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "StaffContact".email IS NULL AND EXCLUDED.email IS NOT NULL;

INSERT INTO "StaffContact" ("id", "role", "name", "nameKey", "email", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'business_manager',
  picked.name,
  picked.name_key,
  picked.email,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (name_key)
    name,
    name_key,
    email
  FROM (
    SELECT
      regexp_replace(btrim("businessManagerName"), '\s+', ' ', 'g') AS name,
      lower(regexp_replace(btrim("businessManagerName"), '\s+', ' ', 'g')) AS name_key,
      CASE
        WHEN btrim(COALESCE("businessManagerEmail", '')) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        THEN btrim("businessManagerEmail")
        ELSE NULL
      END AS email,
      "sentAt"
    FROM "SurveyInvite"
    WHERE "businessManagerName" IS NOT NULL AND btrim("businessManagerName") <> ''
  ) cleaned
  ORDER BY name_key, (email IS NULL), "sentAt" DESC NULLS LAST
) picked
ON CONFLICT ("role", "nameKey") DO UPDATE
SET
  email = COALESCE("StaffContact".email, EXCLUDED.email),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "StaffContact".email IS NULL AND EXCLUDED.email IS NOT NULL;

INSERT INTO "StaffContact" ("id", "role", "name", "nameKey", "email", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'job_manager',
  picked.name,
  picked.name_key,
  picked.email,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (name_key)
    name,
    name_key,
    email
  FROM (
    SELECT
      regexp_replace(btrim("jobManagerName"), '\s+', ' ', 'g') AS name,
      lower(regexp_replace(btrim("jobManagerName"), '\s+', ' ', 'g')) AS name_key,
      CASE
        WHEN btrim(COALESCE("jobManagerEmail", '')) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        THEN btrim("jobManagerEmail")
        ELSE NULL
      END AS email,
      "sentAt"
    FROM "SurveyInvite"
    WHERE "jobManagerName" IS NOT NULL AND btrim("jobManagerName") <> ''
  ) cleaned
  ORDER BY name_key, (email IS NULL), "sentAt" DESC NULLS LAST
) picked
ON CONFLICT ("role", "nameKey") DO UPDATE
SET
  email = COALESCE("StaffContact".email, EXCLUDED.email),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "StaffContact".email IS NULL AND EXCLUDED.email IS NOT NULL;
