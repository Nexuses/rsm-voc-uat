import { describe, expect, it } from "vitest";
import { TESTIMONIAL_COPY } from "@/app/testimonial/[token]/testimonial-copy";
import { formatLocaleCopy } from "@/lib/survey/voice-locale";

describe("testimonial page copy", () => {
  it("defines every string for English and Arabic", () => {
    for (const language of ["en", "ar"] as const) {
      const copy = TESTIMONIAL_COPY[language];
      for (const [key, value] of Object.entries(copy)) {
        expect(typeof value, `${language}.${key}`).toBe("string");
        expect(value.trim().length, `${language}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("localizes the greeting and keeps the Arabic page in Arabic", () => {
    expect(formatLocaleCopy(TESTIMONIAL_COPY.en.greetingNamed, { name: "Sam" })).toBe(
      "Dear Sam,"
    );
    expect(formatLocaleCopy(TESTIMONIAL_COPY.ar.greetingNamed, { name: "Sam" })).toBe(
      "مرحباً Sam،"
    );
    // Survey/testimonial wording that must stay in Arabic, not fall back to English.
    expect(TESTIMONIAL_COPY.ar.title).toBe("مشاركة شهادة");
    expect(TESTIMONIAL_COPY.ar.eyebrow).toBe("صوت العملاء");
    expect(TESTIMONIAL_COPY.ar.submit).toMatch(/[\u0600-\u06FF]/);
    expect(TESTIMONIAL_COPY.ar.approveLabel).toMatch(/[\u0600-\u06FF]/);
  });
});
