import { describe, expect, it } from "vitest";
import {
  captionAdvanceMs,
  formatVoiceTranscriptMessage,
  splitCaptionLines,
  stripVoiceAudioTags,
} from "@/lib/survey/voice-transcript";

describe("stripVoiceAudioTags", () => {
  it("removes ElevenLabs emotion and delivery tags", () => {
    expect(
      stripVoiceAudioTags("[happy] Thank you for sharing that with me.")
    ).toBe("Thank you for sharing that with me.");
    expect(
      stripVoiceAudioTags("[sad] I understand. [whispers] Please take your time.")
    ).toBe("I understand. Please take your time.");
  });

  it("leaves normal survey text unchanged", () => {
    const question =
      "On a scale of 1 to 5, how satisfied are you with the service?";
    expect(stripVoiceAudioTags(question)).toBe(question);
  });

  it("returns an empty string when the message is only audio tags", () => {
    expect(stripVoiceAudioTags("[happy] [excited]")).toBe("");
    expect(formatVoiceTranscriptMessage("[sad]")).toBe("");
  });
});

describe("splitCaptionLines", () => {
  it("splits agent speech into sentence lines and strips tags", () => {
    expect(
      splitCaptionLines(
        "[happy] Thank you for your time. How satisfied are you overall?"
      )
    ).toEqual([
      "Thank you for your time.",
      "How satisfied are you overall?",
    ]);
  });

  it("returns an empty list for tag-only input", () => {
    expect(splitCaptionLines("[happy]")).toEqual([]);
  });
});

describe("captionAdvanceMs", () => {
  it("scales with line length and stays within bounds", () => {
    const short = captionAdvanceMs("Hello.", { isSpeaking: true });
    const long = captionAdvanceMs(
      "On a scale of one to five, how satisfied are you with the overall quality of services?",
      { isSpeaking: true }
    );
    expect(short).toBeGreaterThanOrEqual(1500);
    expect(short).toBeLessThanOrEqual(4500);
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThanOrEqual(4500);
  });

  it("slows slightly when the agent is not speaking", () => {
    const line = "Thank you for sharing that feedback with us today.";
    expect(captionAdvanceMs(line, { isSpeaking: false })).toBeGreaterThan(
      captionAdvanceMs(line, { isSpeaking: true })
    );
  });
});
