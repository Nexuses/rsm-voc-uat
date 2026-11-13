import { afterEach, describe, expect, it } from "vitest";
import {
  processScheduledCxReport,
  submittedInReportCadence,
} from "@/lib/scheduled-cx-report";

describe("submittedInReportCadence", () => {
  const now = new Date("2026-08-19T12:00:00.000Z");

  it("includes the last 7 days for weekly reports", () => {
    expect(
      submittedInReportCadence("2026-08-13T12:00:00.000Z", "weekly", now)
    ).toBe(true);
    expect(
      submittedInReportCadence("2026-08-11T11:59:00.000Z", "weekly", now)
    ).toBe(false);
  });

  it("includes the current UTC month for monthly reports", () => {
    expect(
      submittedInReportCadence("2026-08-01T00:00:00.000Z", "monthly", now)
    ).toBe(true);
    expect(
      submittedInReportCadence("2026-07-31T23:59:59.000Z", "monthly", now)
    ).toBe(false);
  });

  it("includes the current UTC quarter for quarterly reports", () => {
    expect(
      submittedInReportCadence("2026-07-01T00:00:00.000Z", "quarterly", now)
    ).toBe(true);
    expect(
      submittedInReportCadence("2026-06-30T23:59:59.000Z", "quarterly", now)
    ).toBe(false);
  });
});

describe("processScheduledCxReport", () => {
  const originalNotify = process.env.SURVEY_COMPLETION_NOTIFY_TO;

  afterEach(() => {
    if (originalNotify === undefined) {
      delete process.env.SURVEY_COMPLETION_NOTIFY_TO;
    } else {
      process.env.SURVEY_COMPLETION_NOTIFY_TO = originalNotify;
    }
  });

  it("skips sending when SURVEY_COMPLETION_NOTIFY_TO is empty", async () => {
    delete process.env.SURVEY_COMPLETION_NOTIFY_TO;
    const result = await processScheduledCxReport("weekly");
    expect(result).toEqual({
      sent: false,
      skipped: "no_recipients",
      cadence: "weekly",
      responseCount: 0,
    });
  });
});
