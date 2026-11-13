import { afterEach, describe, expect, it, vi } from "vitest";
import { getStaffDirectory, lookupStaffEmails } from "@/lib/survey-staff-directory";

describe("survey staff directory", () => {
  const original = process.env.SURVEY_STAFF_DIRECTORY;

  afterEach(() => {
    vi.restoreAllMocks();
    if (original === undefined) {
      delete process.env.SURVEY_STAFF_DIRECTORY;
    } else {
      process.env.SURVEY_STAFF_DIRECTORY = original;
    }
  });

  it("returns no emails when the directory is not configured", () => {
    delete process.env.SURVEY_STAFF_DIRECTORY;
    expect(lookupStaffEmails(["Partner One"])).toEqual([]);
  });

  it("matches names case- and whitespace-insensitively and de-duplicates", () => {
    process.env.SURVEY_STAFF_DIRECTORY = JSON.stringify({
      "Partner One": "partner.one@example.com",
      "Team  Leader": "leader@example.com",
    });

    expect(
      lookupStaffEmails([" partner one ", "team leader", "Unknown Person", null, "PARTNER ONE"])
    ).toEqual(["partner.one@example.com", "leader@example.com"]);
  });

  it("ignores invalid JSON and invalid email entries", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    process.env.SURVEY_STAFF_DIRECTORY = "not json";
    expect(getStaffDirectory().size).toBe(0);

    process.env.SURVEY_STAFF_DIRECTORY = JSON.stringify({
      "Partner One": "not-an-email",
      "Partner Two": "partner.two@example.com",
    });
    expect([...getStaffDirectory().values()]).toEqual(["partner.two@example.com"]);
  });
});
