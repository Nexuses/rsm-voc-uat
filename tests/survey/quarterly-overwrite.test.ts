import { describe, expect, it } from "vitest";
import {
  calendarQuarterKey,
  calendarQuarterRange,
  normalizeRespondentEmail,
} from "@/lib/survey/quarterly-overwrite";

describe("calendar quarter helpers", () => {
  it("keys UTC calendar quarters", () => {
    expect(calendarQuarterKey(new Date("2026-01-15T12:00:00.000Z"))).toBe(
      "2026-Q1"
    );
    expect(calendarQuarterKey(new Date("2026-04-01T00:00:00.000Z"))).toBe(
      "2026-Q2"
    );
    expect(calendarQuarterKey(new Date("2026-09-30T23:59:59.000Z"))).toBe(
      "2026-Q3"
    );
    expect(calendarQuarterKey(new Date("2026-12-31T23:59:59.000Z"))).toBe(
      "2026-Q4"
    );
  });

  it("returns half-open UTC ranges", () => {
    const { start, end } = calendarQuarterRange(
      new Date("2026-08-10T10:00:00.000Z")
    );
    expect(start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("normalizes respondent emails", () => {
    expect(normalizeRespondentEmail("  Ada@Example.COM ")).toBe(
      "ada@example.com"
    );
    expect(normalizeRespondentEmail("")).toBeNull();
    expect(normalizeRespondentEmail("not-an-email")).toBeNull();
  });
});
