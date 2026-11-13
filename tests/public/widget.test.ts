import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "public", "widget.js"),
  "utf8"
);

describe("public metrics widget", () => {
  it("supports independent CSAT, CES, NPS, and combined embeds", () => {
    expect(source).toContain('data-metric');
    expect(source).toContain('"csat"');
    expect(source).toContain('"ces"');
    expect(source).toContain('"nps"');
    expect(source).toContain('"all"');
    expect(source).toContain("/api/public/metrics");
  });

  it("renders CES gauge layout aligned with the CX dashboard", () => {
    expect(source).toContain("Avg ease score");
    expect(source).toContain("stroke-dasharray");
    expect(source).toContain("rsm-voc-ces-footer");
  });

  it("keeps methodology scale smileys aligned when labels wrap", () => {
    expect(source).toContain("align-items:start");
    expect(source).toContain("min-height:2.8em");
  });

  it("uses metric identity colors and the Satisfied/Easy scale green", () => {
    expect(source).toContain('csat: "#3f9c35"');
    expect(source).toContain('ces: "#888b8d"');
    expect(source).toContain('nps: "#009cde"');
    expect(source).toContain('#65b05d');
    expect(source).not.toContain("#57a000");
  });

  it("renders only aggregate metric and sanitized theme fields", () => {
    expect(source).toContain("favorablePercent");
    expect(source).toContain("promoterPercent");
    expect(source).toContain("METHODOLOGY");
    expect(source).toContain("rsm-voc-scale-cell");
    expect(source).toContain("surveysSent");
    expect(source).toContain("inviteResponsesReceived");
    expect(source).toContain("inviteResponseRate");
    expect(source).toContain("Surveys sent");
    expect(source).toContain("Responses received");
    expect(source).toContain("Response rate");
    expect(source).toContain("Performance indicators");
    expect(source).toContain("renderMethodologyColumn");
    expect(source).toContain("rsm-voc-scale-bar");
    expect(source).toContain("resolveWidgetScript");
    expect(source).not.toMatch(
      /\.fullName|\.company|\.designation|\.comment|\.rawPayload/
    );
  });
});
