import { describe, expect, it } from "vitest";
import {
  applyHouseStyleToNarrative,
  assembleCxNarrativeUserPrompt,
  buildCxNarrativeSystemPrompt,
  buildNarrativeStatsBundle,
  cxReportNarrativeSchema,
  enforceRsmNarrativeHouseStyle,
  loadCxNarrativeGuidelines,
} from "@/lib/ai/cx-report-narrative";
import { ContactAliaser } from "@/lib/ai/minimize";
import type { DashboardAnalyticsItem } from "@/lib/dashboard-analytics";

describe("CX report narrative helpers", () => {
  it("loads RSM guidelines into the system prompt", () => {
    const guidelines = loadCxNarrativeGuidelines();
    expect(guidelines).toContain("RSM in Kuwait");
    expect(guidelines).toContain("Oxford comma");

    const system = buildCxNarrativeSystemPrompt();
    expect(system).toContain("Communications Director");
    expect(system).toContain("RSM in Kuwait");
    expect(system.toLowerCase()).toContain("few-shot");
  });

  it("redacts emails from comment samples in the user prompt", () => {
    const aliaser = new ContactAliaser();
    const prompt = assembleCxNarrativeUserPrompt({
      stats: {
        periodLabel: "1 Jan 2026 – 31 Dec 2026",
        responseCount: 2,
        csatAverage: 4.5,
        csatFavorablePercent: 90,
        cesAverage: 6,
        cesFavorablePercent: 80,
        npsScore: 50,
        promoterPercent: 60,
        detractorPercent: 10,
        themes: [{ theme: "Communication", count: 2 }],
        commentSampleCount: 1,
      },
      commentSample: ["Please call me at client@example.com"],
      priorNarratives: [],
      aliaser,
    });

    expect(prompt).not.toContain("client@example.com");
    expect(prompt).toContain("[contact-");
    expect(prompt).toContain("STATISTICS:");
  });

  it("applies house style replacements", () => {
    expect(enforceRsmNarrativeHouseStyle("RSM Kuwait, and partners")).toBe(
      "RSM in Kuwait and partners"
    );

    const styled = applyHouseStyleToNarrative({
      executiveSummary: "RSM KW saw steady results, and trust remained.",
      csatNarrative: "CSAT held.",
      cesNarrative: "CES held.",
      npsNarrative: "NPS held.",
      voiceOfClientThemes: "Themes noted.",
      outlook: "We aim to improve.",
    });
    expect(styled.executiveSummary).toBe(
      "RSM in Kuwait saw steady results and trust remained."
    );
  });

  it("validates narrative schema and builds stats without PII fields", () => {
    const items: DashboardAnalyticsItem[] = [
      {
        responseId: "r1",
        submittedAt: "2026-06-01T10:00:00.000Z",
        company: "Example Co",
        clientName: "Noor",
        source: "typed",
        sentiment: "positive",
        metrics: { csat: 5, ces: 6, nps: 9 },
        keyDrivers: ["Communication"],
        riskSignals: [],
        answers: [],
      },
    ];
    const stats = buildNarrativeStatsBundle({
      periodLabel: "test",
      items,
      commentSample: ["Great service"],
    });
    expect(stats.responseCount).toBe(1);
    expect(stats).not.toHaveProperty("email");
    expect(stats.themes[0]?.theme).toBe("Communication");

    const parsed = cxReportNarrativeSchema.parse({
      executiveSummary: "Summary for RSM in Kuwait.",
      csatNarrative: "CSAT narrative.",
      cesNarrative: "CES narrative.",
      npsNarrative: "NPS narrative.",
      voiceOfClientThemes: "Themes.",
      outlook: "Outlook.",
    });
    expect(parsed.executiveSummary).toContain("RSM in Kuwait");
  });
});
