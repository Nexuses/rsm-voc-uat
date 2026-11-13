import { describe, expect, it } from "vitest";
import { SURVEY_QUESTIONS } from "@/lib/survey/constants";
import {
  buildSurveyResponseSummaryHtml,
  buildSurveyResponseSummaryText,
  renderSurveyThankYouEmail,
  SURVEY_THANKYOU_SUBJECT,
} from "@/lib/survey-thankyou-email";

const sampleAnswers = [
  {
    question_number: 1,
    question_text: SURVEY_QUESTIONS[0].question,
    metric: "csat" as const,
    scale_min: 1,
    scale_max: 5,
    rating: 5,
    reason_text: "Clear communication throughout.",
    reason_method: "typed" as const,
  },
  {
    question_number: 2,
    question_text: SURVEY_QUESTIONS[1].question,
    metric: "ces" as const,
    scale_min: 1,
    scale_max: 7,
    rating: 6,
    reason_text: "Easy to reach the team.",
    reason_method: "typed" as const,
  },
  {
    question_number: 3,
    question_text: SURVEY_QUESTIONS[2].question,
    metric: "nps" as const,
    scale_min: 0,
    scale_max: 10,
    rating: 9,
    reason_text: "Would recommend RSM.",
    reason_method: "typed" as const,
  },
];

describe("survey thank-you email", () => {
  it("builds an HTML summary with scores and comments", () => {
    const html = buildSurveyResponseSummaryHtml({
      csatScore: 5,
      cesScore: 6,
      npsScore: 9,
      answers: sampleAnswers,
    });

    expect(html).toContain("CSAT");
    expect(html).toContain("5 / 5");
    expect(html).toContain("Clear communication throughout.");
    expect(html).toContain("Would recommend RSM.");
  });

  it("builds a plain-text summary", () => {
    const text = buildSurveyResponseSummaryText({
      csatScore: 5,
      cesScore: 6,
      npsScore: 9,
      answers: sampleAnswers,
    });

    expect(text).toContain("CSAT: 5 / 5");
    expect(text).toContain("Comment: Easy to reach the team.");
  });

  it("renders the branded thank-you email", () => {
    const rendered = renderSurveyThankYouEmail({
      recipient: {
        email: "client@example.com",
        customerName: "Sara Al-Sabah",
      },
      completedAt: new Date("2026-06-30T10:00:00.000Z"),
      csatScore: 5,
      cesScore: 6,
      npsScore: 9,
      answers: sampleAnswers,
    });

    expect(rendered.subject).toBe(SURVEY_THANKYOU_SUBJECT);
    expect(rendered.html).toContain("Dear Sara Al-Sabah");
    expect(rendered.html).toContain("Your responses");
    expect(rendered.html).toContain("5 / 5");
    expect(rendered.html).not.toContain("{{testimonial_ask}}");
    expect(rendered.html).not.toContain("Review your testimonial");
    expect(rendered.html).not.toContain("Share a testimonial");
    expect(rendered.text).toContain("Thank you for completing");
    expect(rendered.text).not.toContain("Testimonial");
  });

  it("highlights a draft review when the survey is Positive and has a comment", () => {
    const rendered = renderSurveyThankYouEmail({
      recipient: {
        email: "client@example.com",
        customerName: "Sara Al-Sabah",
      },
      completedAt: new Date("2026-06-30T10:00:00.000Z"),
      csatScore: 5,
      cesScore: 6,
      npsScore: 9,
      answers: sampleAnswers,
      testimonialAsk: {
        id: "testimonial-1",
        kind: "draft_approval",
        url: "https://survey.example/testimonial/token",
      },
    });

    expect(rendered.html).toContain("background:#F3FAF1");
    expect(rendered.html).toContain("Review your testimonial");
    expect(rendered.html).toContain("https://survey.example/testimonial/token");
    expect(rendered.text).toContain("drafted one from what you wrote");
  });

  it("asks for an original testimonial when there is no comment", () => {
    const rendered = renderSurveyThankYouEmail({
      recipient: { email: "client@example.com", customerName: "Sara Al-Sabah" },
      completedAt: new Date("2026-06-30T10:00:00.000Z"),
      csatScore: 4,
      cesScore: 5,
      npsScore: 9,
      answers: [],
      testimonialAsk: {
        id: "testimonial-2",
        kind: "original_request",
        url: "https://survey.example/testimonial/plain",
      },
    });

    expect(rendered.html).toContain("Share a testimonial");
    expect(rendered.html).not.toContain("Review your testimonial");
    expect(rendered.text).toContain("written testimonial");
  });
});
