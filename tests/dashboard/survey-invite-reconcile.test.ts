import { describe, expect, it } from "vitest";
import { reconcileVoiceInviteCompletion } from "@/lib/survey-invite-tracking";

describe("reconcileVoiceInviteCompletion", () => {
  it("is exported for voice webhook fallback linking", () => {
    expect(typeof reconcileVoiceInviteCompletion).toBe("function");
  });
});
