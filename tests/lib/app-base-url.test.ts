import { afterEach, describe, expect, it } from "vitest";
import {
  getAppBaseUrl,
  getSurveyPublicOrigin,
  getSurveyUrl,
} from "@/lib/app-base-url";

describe("app base URL helpers", () => {
  const originalSurveyPublicUrl = process.env.SURVEY_PUBLIC_URL;
  const originalNextAuthUrl = process.env.NEXTAUTH_URL;

  afterEach(() => {
    if (originalSurveyPublicUrl === undefined) {
      delete process.env.SURVEY_PUBLIC_URL;
    } else {
      process.env.SURVEY_PUBLIC_URL = originalSurveyPublicUrl;
    }

    if (originalNextAuthUrl === undefined) {
      delete process.env.NEXTAUTH_URL;
    } else {
      process.env.NEXTAUTH_URL = originalNextAuthUrl;
    }
  });

  it("uses SURVEY_PUBLIC_URL for invite survey links", () => {
    process.env.NEXTAUTH_URL = "https://rsm-voc-platform.vercel.app";
    process.env.SURVEY_PUBLIC_URL =
      "https://rsm-voc-survey-new.vercel.app/survey";

    expect(getSurveyUrl()).toBe("https://rsm-voc-survey-new.vercel.app/survey");
    expect(getSurveyPublicOrigin()).toBe(
      "https://rsm-voc-survey-new.vercel.app"
    );
    expect(getAppBaseUrl()).toBe("https://rsm-voc-platform.vercel.app");
  });

  it("falls back to NEXTAUTH_URL when SURVEY_PUBLIC_URL is unset", () => {
    delete process.env.SURVEY_PUBLIC_URL;
    process.env.NEXTAUTH_URL = "https://rsm-voc-platform.vercel.app";

    expect(getSurveyUrl()).toBe("https://rsm-voc-platform.vercel.app/survey");
  });
});
