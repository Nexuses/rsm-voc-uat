import { describe, expect, it } from "vitest";
import {
  formatSurveyInviteFromAddress,
  getSurveyInviteDefaults,
  getSurveyUrl,
  isMailConfigured,
  SURVEY_INVITE_SENDER_NAME,
} from "@/lib/survey-invite-email";

describe("survey invite email helpers", () => {
  it("builds defaults with the branded template subject and CSV columns", () => {
    const defaults = getSurveyInviteDefaults();

    expect(defaults.subject.length).toBeGreaterThan(0);
    expect(defaults.surveyUrl).toBe(getSurveyUrl());
    expect(defaults.csvColumns).toEqual([
      "email",
      "department",
      "service",
      "partner",
      "partneremail",
      "businessmanager",
      "businessmanageremail",
      "jobmanager",
      "jobmanageremail",
      "teamleader",
      "customername",
      "company",
      "designation",
      "projectid",
      "surveyorder",
    ]);
    expect(defaults.followupScheduleDays).toEqual([3, 6, 9, 12, 15]);
  });

  it("uses only SURVEY_INVITE_DEFAULT_TO for invite defaults", () => {
    const originalDefaultTo = process.env.SURVEY_INVITE_DEFAULT_TO;

    process.env.SURVEY_INVITE_DEFAULT_TO = "cx-team@example.com";
    expect(getSurveyInviteDefaults().to).toBe("cx-team@example.com");

    delete process.env.SURVEY_INVITE_DEFAULT_TO;
    expect(getSurveyInviteDefaults().to).toBe("");

    process.env.SURVEY_INVITE_DEFAULT_TO = originalDefaultTo;
  });

  it("formats the sender display name for email delivery", () => {
    expect(SURVEY_INVITE_SENDER_NAME).toBe("RSM in Kuwait");
    expect(formatSurveyInviteFromAddress("survey@example.com")).toBe(
      '"RSM in Kuwait" <survey@example.com>'
    );
  });

  it("reports mail readiness from SendGrid env vars", () => {
    const original = {
      apiKey: process.env.SENDGRID_API_KEY,
      from: process.env.FROM_EMAIL,
    };

    delete process.env.SENDGRID_API_KEY;
    expect(isMailConfigured()).toBe(false);

    process.env.SENDGRID_API_KEY = "sg-test-key";
    process.env.FROM_EMAIL = "survey@example.com";
    expect(isMailConfigured()).toBe(true);

    process.env.SENDGRID_API_KEY = original.apiKey;
    process.env.FROM_EMAIL = original.from;
  });
});
