import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    staffContact: {
      findUnique: mocks.findUnique,
      findMany: mocks.findMany,
      create: mocks.create,
      update: mocks.update,
      delete: mocks.delete,
    },
  },
}));

import { suggestionsFromDirectory } from "@/lib/survey-staff-contacts";
import {
  createDirectoryEntry,
  DirectoryRequestError,
  updateDirectoryEntry,
} from "@/lib/survey-directory";

describe("survey directory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds send-survey suggestions from directory rows only", () => {
    const suggestions = suggestionsFromDirectory([
      { role: "department", name: "Assurance", email: null },
      { role: "service", name: "Audit", email: null },
      {
        role: "partner",
        name: "Sriram Gopalakrishnan",
        email: "sriram@example.com",
      },
      { role: "partner", name: "No Email", email: null },
      {
        role: "business_manager",
        name: "Sara Al-Mutairi",
        email: "sara@example.com",
      },
      { role: "job_manager", name: "Job Person", email: "job@example.com" },
      { role: "team_leader", name: "Team Lead", email: null },
      { role: "unknown", name: "Ignored", email: "ignored@example.com" },
    ]);

    expect(suggestions.departments).toEqual(["Assurance"]);
    expect(suggestions.services).toEqual(["Audit"]);
    expect(suggestions.partners).toEqual(["No Email", "Sriram Gopalakrishnan"]);
    expect(suggestions.partnerEmails).toEqual(["sriram@example.com"]);
    expect(suggestions.partnerEmailByName["sriram gopalakrishnan"]).toBe(
      "sriram@example.com"
    );
    expect(suggestions.businessManagerEmails).toEqual(["sara@example.com"]);
    expect(suggestions.jobManagers).toEqual(["Job Person"]);
    expect(suggestions.teamLeaders).toEqual(["Team Lead"]);
    expect(suggestions.departments).not.toContain("Ignored");
  });

  it("rejects a duplicate name in the same list regardless of case", async () => {
    mocks.findUnique.mockResolvedValue({ id: "existing" });
    await expect(
      createDirectoryEntry({
        role: "department",
        name: "  Assurance  ",
      })
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects an email on a name-only list", async () => {
    await expect(
      createDirectoryEntry({
        role: "team_leader",
        name: "Team Lead",
        email: "lead@example.com",
      })
    ).rejects.toBeInstanceOf(DirectoryRequestError);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("stores a partner email and keeps the name key case-insensitive", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockImplementation(async ({ data }) => data);
    const entry = await createDirectoryEntry({
      role: "partner",
      name: "  Sara   Al-Mutairi ",
      email: "sara@example.com",
    });
    expect(entry).toMatchObject({
      role: "partner",
      name: "Sara Al-Mutairi",
      nameKey: "sara al-mutairi",
      email: "sara@example.com",
    });
  });

  it("rejects a rename that collides with another entry", async () => {
    mocks.findUnique
      .mockResolvedValueOnce({
        id: "row-1",
        role: "service",
        name: "Audit",
        email: null,
      })
      .mockResolvedValueOnce({ id: "row-2" });
    await expect(
      updateDirectoryEntry("row-1", { name: "Tax" })
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe("directory seed migration", () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      "prisma/migrations/20261008120000_survey_directory_seed/migration.sql"
    ),
    "utf8"
  );

  it("seeds the current departments and invite-backed people", () => {
    for (const department of [
      "ASSURANCE",
      "TAX",
      "RISK ADVISORY",
      "CYBERSECURITY / IT RISK",
      "ESG / SUSTAINABILITY",
      "CORPORATE FINANCE",
      "CX CONSULTING",
    ]) {
      expect(sql).toContain(department);
    }
    expect(sql).toContain("'service'");
    expect(sql).toContain("'team_leader'");
    expect(sql).toContain("'business_manager'");
    expect(sql).toContain("'job_manager'");
    expect(sql).toContain("COALESCE(\"StaffContact\".email, EXCLUDED.email)");
  });
});
