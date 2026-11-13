import { describe, expect, it } from "vitest";
import { SURVEY_QUESTIONS } from "@/lib/survey/constants";
import { VOICE_LOCALES } from "@/lib/survey/voice-locale";
import {
  currentLiveSurveyDefinition,
  surveyDefinitionSchema,
} from "@/lib/surveys/definition";
import { toAnswerRows } from "@/lib/surveys/answers";
import { assertEditable, assertPublishable, SurveyVersionError } from "@/lib/surveys/service";

describe("survey definitions", () => {
  it("mirrors the live survey copy verbatim in both languages", () => {
    const definition = surveyDefinitionSchema.parse(currentLiveSurveyDefinition());
    expect(definition.questions.map((q) => q.text.en)).toEqual(
      SURVEY_QUESTIONS.map((q) => q.question)
    );
    for (const question of definition.questions) {
      const arabic = VOICE_LOCALES.ar.typed.questions.find((q) => q.metric === question.metric);
      expect(question.text.ar).toBe(arabic?.question);
    }
    expect(definition.questions.map((q) => q.scale)).toEqual(
      SURVEY_QUESTIONS.map((q) => ({ min: q.min, max: q.max }))
    );
  });

  it("rejects duplicate keys, missing Arabic, and bad scales", () => {
    const base = currentLiveSurveyDefinition();
    const duplicate = { ...base, questions: [base.questions[0], base.questions[0]] };
    expect(surveyDefinitionSchema.safeParse(duplicate).success).toBe(false);

    const noArabic = {
      ...base,
      questions: [{ ...base.questions[0], text: { en: "How was it?" } }],
    };
    expect(surveyDefinitionSchema.safeParse(noArabic).success).toBe(false);
    expect(
      surveyDefinitionSchema.safeParse({ ...noArabic, locales: ["en"] }).success
    ).toBe(true);

    const badScale = {
      locales: ["en"],
      questions: [{ key: "x", kind: "rating", scale: { min: 5, max: 1 }, text: { en: "X" } }],
    };
    expect(surveyDefinitionSchema.safeParse(badScale).success).toBe(false);
  });

  it("only lets drafts be edited or published", () => {
    expect(() => assertEditable("draft")).not.toThrow();
    expect(() => assertEditable("published")).toThrow(SurveyVersionError);
    expect(() => assertPublishable("archived")).toThrow(SurveyVersionError);
  });
});

describe("toAnswerRows", () => {
  it("normalizes stored answers and ignores junk", () => {
    expect(
      toAnswerRows([
        { question_number: 1, metric: "csat", rating: 4, reason_text: "  ok " },
        { question_number: 1, metric: "csat", rating: 1 },
        { question_number: 7, rating: 3 },
        null,
      ])
    ).toEqual([
      { questionKey: "csat", metric: "csat", numericValue: 4, textValue: "ok" },
      { questionKey: "q7", metric: null, numericValue: 3, textValue: null },
    ]);
    expect(toAnswerRows("nope")).toEqual([]);
  });
});
