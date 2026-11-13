import { describe, expect, it } from "vitest";
import { normalizeAccountName } from "@/lib/domain/accounts";
import {
  planAccounts,
  plannedEmployees,
  plannedServiceLines,
  serviceLineCodeFor,
} from "@/lib/domain/org-backfill";
import { SURVEY_DEPARTMENTS } from "@/lib/survey-org-structure";

describe("organization backfill planning", () => {
  it("normalizes common Kuwaiti company suffixes and punctuation", () => {
    expect(normalizeAccountName("Example Co. W.L.L.")).toBe("example");
    expect(normalizeAccountName("EXAMPLE CO")).toBe("example");
    expect(normalizeAccountName("  Gulf Trading (K.S.C.C.) ")).toBe("gulf trading");
    expect(normalizeAccountName("")).toBe("");
  });

  it("groups spellings into one account named by the most frequent spelling", () => {
    const accounts = planAccounts([
      "Example Co",
      "Example Co. W.L.L.",
      "Example Co",
      null,
      "  ",
      "Other Holding",
    ]);
    expect(accounts).toEqual([
      { normalizedName: "example", name: "Example Co" },
      { normalizedName: "other holding", name: "Other Holding" },
    ]);
  });

  it("seeds one service line per department and every listed partner", () => {
    expect(plannedServiceLines().map((line) => line.code)).toEqual(SURVEY_DEPARTMENTS);
    const partners = plannedEmployees();
    expect(partners.every((partner) => partner.level === "partner")).toBe(true);
    expect(partners.find((p) => p.name === "Firas Georges")?.serviceLineCode).toBe("ASSURANCE");
  });

  it("maps free-text departments case-insensitively", () => {
    expect(serviceLineCodeFor(" tax ")).toBe("TAX");
    expect(serviceLineCodeFor("Unknown")).toBeNull();
    expect(serviceLineCodeFor(null)).toBeNull();
  });
});
