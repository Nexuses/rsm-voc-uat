import { describe, expect, it } from "vitest";
import {
  buildVoiceFirstMessage,
  buildVoiceInviteOpening,
} from "@/lib/survey/voice-first-message";

describe("buildVoiceInviteOpening", () => {
  it("asks for full name in English when invite context is empty", () => {
    expect(
      buildVoiceInviteOpening("en", {
        fullName: "",
        company: "",
        designation: "",
      })
    ).toBe("May I have your full name, please?");
  });

  it("confirms known English invite details in the opening line", () => {
    const message = buildVoiceFirstMessage("en", {
      fullName: "Sara Al-Sabah",
      company: "Acme",
      designation: "CFO",
    });

    expect(message).toContain("Sara Al-Sabah");
    expect(message).toContain("Acme");
    expect(message).toContain("CFO");
    expect(message).toContain("Is that correct?");
    expect(message.toLowerCase()).not.toContain("english or arabic");
  });

  it("confirms known Arabic invite details without asking for name again", () => {
    const opening = buildVoiceInviteOpening("ar", {
      fullName: "سارة الصباح",
      company: "أكمي",
      designation: "المديرة المالية",
    });

    expect(opening).toContain("سارة الصباح");
    expect(opening).toContain("أكمي");
    expect(opening).toContain("هل هذا صحيح؟");
    expect(opening).not.toContain("هل يمكنني معرفة اسمك الكامل");
  });
});
