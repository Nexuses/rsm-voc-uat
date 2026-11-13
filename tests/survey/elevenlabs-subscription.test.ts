import { describe, expect, it } from "vitest";
import { summarizeVoiceCredits } from "@/lib/elevenlabs/subscription";

describe("summarizeVoiceCredits", () => {
  it("marks low remaining usage as warn and critical", () => {
    expect(
      summarizeVoiceCredits({
        characterCount: 8500,
        characterLimit: 10000,
      }).level
    ).toBe("warn");

    expect(
      summarizeVoiceCredits({
        characterCount: 9600,
        characterLimit: 10000,
      }).level
    ).toBe("critical");
  });

  it("marks fully used credits as exhausted", () => {
    const status = summarizeVoiceCredits({
      characterCount: 10000,
      characterLimit: 10000,
      nextResetUnix: 1893456000,
    });
    expect(status.level).toBe("exhausted");
    expect(status.remaining).toBe(0);
    expect(status.message).toMatch(/exhausted/i);
    expect(status.resetAt).toBe("2030-01-01T00:00:00.000Z");
  });
});
