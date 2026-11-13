import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "public", "widget-reviews.js"),
  "utf8"
);

describe("public reviews widget", () => {
  it("loads the public reviews API into a configurable target", () => {
    expect(source).toContain("/api/public/reviews");
    expect(source).toContain("data-target");
    expect(source).toContain("rsm-voc-reviews");
    expect(source).toContain("resolveWidgetScript");
  });

  it("renders anonymized comment cards with score chips", () => {
    expect(source).toContain("Recent feedback");
    expect(source).toContain("Most recent");
    expect(source).toContain("rsm-voc-review-card");
    expect(source).toContain("rsm-voc-review-attribution");
    expect(source).toContain("formatAttribution");
    expect(source).toContain("rsm-voc-review-chip");
    expect(source).toContain("rsm-voc-review-chip-csat");
    expect(source).toContain("rsm-voc-review-chip-ces");
    expect(source).toContain("rsm-voc-review-chip-nps");
    expect(source).toContain("#3f9c35");
    expect(source).toContain("#009cde");
    expect(source).toContain("#888b8d");
    expect(source).toContain("CSAT");
    expect(source).toContain("CES");
    expect(source).toContain("NPS");
    expect(source).toContain("name and company when available");
  });

  it("does not reference private contact fields", () => {
    expect(source).not.toMatch(/\.email|\.phone|\.rawPayload|sourceKey/);
  });
});