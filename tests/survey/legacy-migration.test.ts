import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "prisma",
    "migrations",
    "20260613133000_add_three_metric_survey",
    "migration.sql"
  ),
  "utf8"
);

describe("legacy CSAT migration", () => {
  it("backfills only CSAT from the legacy Q1 answer or compatibility value", () => {
    expect(migration).toContain('"surveyVersion" TEXT NOT NULL DEFAULT');
    expect(migration).toContain("\"answers\"->0->>'rating'");
    expect(migration).toContain('"avgRating"');
    expect(migration).toMatch(/SET "csatScore" = COALESCE/);
    expect(migration).not.toMatch(/SET "cesScore"/);
    expect(migration).not.toMatch(/SET "npsScore"/);
  });
});
