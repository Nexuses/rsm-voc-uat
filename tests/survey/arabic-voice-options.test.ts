import { describe, expect, it } from "vitest";
import {
  ARABIC_HOST_VOICE_ID,
  VOICE_HOST_OPTIONS,
  getHostVoiceId,
  getHostVoiceIdForLanguage,
  isArabicVoiceSelection,
  voiceHostToSessionLanguage,
} from "@/lib/survey/arabic-voice-options";

describe("voice host options", () => {
  it("offers English and Arabic hosts only", () => {
    expect(VOICE_HOST_OPTIONS).toEqual([
      { key: "english", language: "en" },
      {
        key: "arabic",
        language: "ar",
        voiceId: ARABIC_HOST_VOICE_ID,
      },
    ]);
  });

  it("maps host selection to session language", () => {
    expect(voiceHostToSessionLanguage("english")).toBe("en");
    expect(voiceHostToSessionLanguage("arabic")).toBe("ar");
    expect(voiceHostToSessionLanguage(null)).toBe("en");
  });

  it("uses the allowlisted Arabic TTS voice only for Arabic", () => {
    expect(getHostVoiceId("arabic")).toBe("v7UCHHCrHj1KBa4E41gb");
    expect(getHostVoiceId("english")).toBeUndefined();
    expect(getHostVoiceId(null)).toBeUndefined();
    expect(getHostVoiceIdForLanguage("ar")).toBe("v7UCHHCrHj1KBa4E41gb");
    expect(getHostVoiceIdForLanguage("en")).toBeUndefined();
  });

  it("distinguishes Arabic host from English", () => {
    expect(isArabicVoiceSelection("arabic")).toBe(true);
    expect(isArabicVoiceSelection("english")).toBe(false);
    expect(isArabicVoiceSelection(null)).toBe(false);
  });
});
