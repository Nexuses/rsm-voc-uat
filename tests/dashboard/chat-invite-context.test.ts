import { describe, expect, it } from "vitest";
import {
  extractLookupTokens,
  isAggregateInviteQuestion,
} from "@/lib/chat-invite-context";

describe("chat invite context token extraction", () => {
  it("treats how-many style questions as aggregate with no weak tokens", () => {
    expect(isAggregateInviteQuestion("how many invites were sent?")).toBe(true);
    expect(extractLookupTokens("how many invites were sent?")).toEqual([]);
    expect(extractLookupTokens("What is the overall outreach response rate?")).toEqual(
      []
    );
  });

  it("still extracts emails and quoted names from aggregate-ish questions", () => {
    expect(
      extractLookupTokens('How many invites did "Acme Holdings" get?')
    ).toContain("Acme Holdings");
    expect(
      extractLookupTokens("what feedback did client@example.com give?")
    ).toContain("client@example.com");
  });

  it("keeps company or person tokens for specific status questions", () => {
    const tokens = extractLookupTokens(
      "What is the invite status for Acme Holdings?"
    );
    expect(tokens).toContain("Acme");
    expect(tokens).toContain("Holdings");
  });
});
