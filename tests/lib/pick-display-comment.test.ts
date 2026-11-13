import { describe, expect, it } from "vitest";
import { pickDisplayComment, stripLikelyPii } from "@/lib/aggregate";

describe("pickDisplayComment", () => {
  it("returns the longest non-empty reason_text", () => {
    expect(
      pickDisplayComment([
        { reason_text: "Good" },
        { reason_text: "   " },
        { reason_text: "Very responsive partnership team" },
        { reason_text: null },
      ])
    ).toBe("Very responsive partnership team");
  });

  it("returns null when no comments exist", () => {
    expect(pickDisplayComment([{ reason_text: "" }, {}])).toBeNull();
    expect(pickDisplayComment(null)).toBeNull();
  });
});

describe("stripLikelyPii", () => {
  it("redacts known identities, emails, and phone numbers", () => {
    expect(
      stripLikelyPii(
        "Acme Corp and Jane Doe were great. Email jane@acme.test or +965 1234 5678.",
        ["Acme Corp", "Jane Doe"]
      )
    ).toBe(
      "the client and the client were great. Email [redacted] or [redacted]."
    );
  });
});
