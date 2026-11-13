import { describe, expect, it } from "vitest";
import {
  SURVEY_QUESTIONS,
  SURVEY_LANGUAGE,
  SURVEY_VERSION,
  TYPED_CONVERSATION_PREFIX,
} from "@/lib/survey/constants";
import { typedSurveySchema } from "@/lib/survey/schema";

const validPayload = {
  submissionId: "c397db2e-8c0b-48fd-a963-cf477c65486b",
  fullName: "Noor Al-Sabah",
  email: "noor@example.com",
  company: "Example Co",
  designation: "Finance Director",
  csatRating: 5,
  csatComment: "The team was responsive.",
  cesRating: 6,
  cesComment: "The process was straightforward.",
  npsRating: 9,
  npsComment: "I would recommend the team.",
  website: "",
};

describe("survey contracts", () => {
  it("keeps the approved English metric definitions fixed", () => {
    expect(SURVEY_QUESTIONS).toEqual([
      {
        questionNumber: 1,
        metric: "csat",
        question:
          "How satisfied are you with the overall quality of services provided by RSM in Kuwait?",
        min: 1,
        max: 5,
      },
      {
        questionNumber: 2,
        metric: "ces",
        question:
          "To what extent do you agree: RSM in Kuwait made it easy for me to get the service and support I needed?",
        min: 1,
        max: 7,
      },
      {
        questionNumber: 3,
        metric: "nps",
        question:
          "On a scale from 0 to 10, how likely are you to recommend RSM in Kuwait to a colleague or business associate?",
        min: 0,
        max: 10,
      },
    ]);
    expect(SURVEY_LANGUAGE).toBe("en");
    expect(SURVEY_VERSION).toBe("three-metric-v2");
    expect(TYPED_CONVERSATION_PREFIX).toBe("typed_");
  });

  it("accepts a complete typed response", () => {
    expect(typedSurveySchema.parse(validPayload)).toEqual({
      ...validPayload,
      language: "en",
    });
  });

  it("keeps the Arabic language chosen on the typed form", () => {
    expect(
      typedSurveySchema.parse({ ...validPayload, language: "ar" }).language
    ).toBe("ar");
  });

  it("coerces values and enforces each metric's scale", () => {
    expect(
      typedSurveySchema.parse({ ...validPayload, csatRating: "4" })
        .csatRating
    ).toBe(4);
    expect(() =>
      typedSurveySchema.parse({ ...validPayload, csatRating: 6 })
    ).toThrow();
    expect(() =>
      typedSurveySchema.parse({ ...validPayload, cesRating: 8 })
    ).toThrow();
    expect(() =>
      typedSurveySchema.parse({ ...validPayload, npsRating: 11 })
    ).toThrow();
    expect(
      typedSurveySchema.parse({ ...validPayload, npsRating: 0 })
        .npsRating
    ).toBe(0);
  });

  it("rejects an automated submission that fills the honeypot", () => {
    expect(() =>
      typedSurveySchema.parse({ ...validPayload, website: "spam.example" })
    ).toThrow();
  });

  it("requires full name, company, and designation", () => {
    expect(() =>
      typedSurveySchema.parse({ ...validPayload, fullName: "" })
    ).toThrow();
    expect(() =>
      typedSurveySchema.parse({ ...validPayload, designation: "" })
    ).toThrow();
  });
});
