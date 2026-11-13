import { describe, expect, it } from "vitest";
import {
  isTestimonialEligible,
  sourceCommentsFromAnswers,
  testimonialKindForComments,
} from "@/lib/testimonials/eligibility";
import { parseTestimonialDraft } from "@/lib/testimonials/draft";
import { publishableQuote } from "@/lib/testimonials/quote";

describe("testimonial eligibility", () => {
  it("accepts an overall Positive survey", () => {
    expect(
      isTestimonialEligible({ csatScore: 4, cesScore: 5, npsScore: 9 })
    ).toBe(true);
    expect(
      isTestimonialEligible({ csatScore: 5, cesScore: 7, npsScore: 10 })
    ).toBe(true);
  });

  it("rejects Neutral and Negative bands", () => {
    // 17/22 = 77% → Neutral.
    expect(
      isTestimonialEligible({ csatScore: 5, cesScore: 4, npsScore: 8 })
    ).toBe(false);
    expect(
      isTestimonialEligible({ csatScore: 5, cesScore: 6, npsScore: 6 })
    ).toBe(false);
    // 9/22 = 41% → Negative.
    expect(
      isTestimonialEligible({ csatScore: 2, cesScore: 3, npsScore: 4 })
    ).toBe(false);
    // 18/22 = 82% → Positive even though no single metric is top-band.
    expect(
      isTestimonialEligible({ csatScore: 3, cesScore: 6, npsScore: 9 })
    ).toBe(true);
  });

  it("treats any comment as a draft review and an empty survey as an original request", () => {
    const comments = sourceCommentsFromAnswers([
      { reason_text: "  Clear advice. " },
      { reason_text: "" },
      { reason_text: "Clear advice." },
    ]);
    expect(comments).toBe("Clear advice.");
    expect(testimonialKindForComments(comments)).toBe("draft_approval");
    expect(testimonialKindForComments("")).toBe("original_request");
  });
});

describe("testimonial draft parsing", () => {
  it("keeps a short draft and rejects invented envelopes", () => {
    expect(parseTestimonialDraft('{"testimonial":"The team was easy to reach."}')).toBe(
      "The team was easy to reach."
    );
    expect(parseTestimonialDraft("not json")).toBeNull();
    expect(parseTestimonialDraft('{"testimonial":""}')).toBeNull();
  });
});

describe("publishable quote", () => {
  it("adds the name only when the client consented", () => {
    const named = publishableQuote({
      clientText: "Clear and responsive.",
      consentName: true,
      respondentName: "Sara Al-Sabah",
      company: "Example Co",
    });
    expect(named).toBe("Clear and responsive.\n— Sara Al-Sabah, Example Co");

    const unnamed = publishableQuote({
      clientText: "Clear and responsive.",
      aiDraft: "Should not replace the client text.",
      consentName: false,
      respondentName: "Sara Al-Sabah",
      company: "Example Co",
    });
    expect(unnamed).toBe("Clear and responsive.");
    expect(unnamed).not.toContain("Sara");
  });
});
