import { describe, expect, it } from "vitest";
import {
  getVoiceConversationLanguage,
  getVoiceLocale,
  isRtlVoiceLanguage,
  VOICE_LOCALES,
} from "@/lib/survey/voice-locale";

describe("voice survey locale copy", () => {
  it("defines English and Arabic UI copy", () => {
    expect(Object.keys(VOICE_LOCALES).sort()).toEqual(["ar", "en"]);
    expect(getVoiceLocale("en").voice.start).toBe("Start voice survey");
    expect(getVoiceLocale("ar").voice.start).toBe("بدء الاستبيان الصوتي");
    // The ready-screen instruction must name the button the client has to press.
    expect(getVoiceLocale("en").voice.agentIdle).toContain(
      getVoiceLocale("en").voice.start
    );
    expect(getVoiceLocale("ar").voice.agentIdle).toContain(
      getVoiceLocale("ar").voice.start
    );
    expect(getVoiceLocale("en").modeChooser.voiceTitle).toBe("Take voice survey");
    expect(getVoiceLocale("ar").typed.questions).toHaveLength(3);
  });

  it("marks Arabic as RTL", () => {
    expect(isRtlVoiceLanguage("en")).toBe(false);
    expect(isRtlVoiceLanguage("ar")).toBe(true);
  });

  it("maps UI language to the agent conversation language", () => {
    expect(getVoiceConversationLanguage("en")).toBe("en");
    expect(getVoiceConversationLanguage("ar")).toBe("ar");
  });

  it("keeps the identity step copy distinct in both languages", () => {
    // The left panel heading and the form heading (and the left intro vs the
    // form subtitle) must not repeat the same sentence on step 1.
    for (const language of ["en", "ar"] as const) {
      const { typed } = getVoiceLocale(language);
      expect(typed.identityTitle).not.toBe(typed.identityFormHeading);
      expect(typed.identityIntro).not.toBe(typed.identityFormSubtitle);
    }
  });
});
