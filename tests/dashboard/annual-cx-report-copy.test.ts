import { describe, expect, it } from "vitest";
import {
  ANNUAL_CX_COVER_TITLE,
  ANNUAL_CX_TAGLINE,
  csatOutlook,
  conclusionCopy,
  headerPeriodLine,
  npsOutlook,
  philosophyCopy,
  summaryOutlookIntro,
} from "@/lib/annual-cx-report-copy";

const BANNED = [
  "ensure",
  "guarantee",
  "will deliver",
  "world-class",
  "best",
  "leading",
  "exceptional",
  "RSM Kuwait",
  "—",
];

describe("annual CX report copy", () => {
  it("uses RSM in Kuwait and avoids banned promotional phrasing", () => {
    const blobs = [
      ...philosophyCopy("1 January 2026 – 19 October 2026"),
      csatOutlook({ favorablePercent: 98, favorableCount: 461, total: 471 }),
      npsOutlook({ score: 81, promoters: 391, detractors: 11, total: 471 }),
      summaryOutlookIntro({
        csatPercent: 98,
        npsScore: 81,
        cesAverage: 4.8,
      }),
      ...conclusionCopy("1 January 2026 – 19 October 2026"),
    ].join("\n");

    expect(blobs).toContain("RSM in Kuwait");
    for (const banned of BANNED) {
      const pattern = new RegExp(
        banned === "—" ? "—" : `\\b${banned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i"
      );
      expect(pattern.test(blobs)).toBe(false);
    }
  });

  it("uses the approved report title, tagline and header line", () => {
    expect(ANNUAL_CX_COVER_TITLE).toBe("Client Experience Report");
    expect(ANNUAL_CX_TAGLINE).toBe("Listening, Learning, Improving");
    expect(headerPeriodLine("2026")).toContain("RSM in Kuwait");
    expect(headerPeriodLine("2026")).not.toContain("Albazie");
  });

  it("injects live numbers into outlook copy", () => {
    const text = csatOutlook({
      favorablePercent: 97,
      favorableCount: 100,
      total: 103,
    });
    expect(text).toContain("97%");
    expect(text).toContain("100 of 103");
  });
});
