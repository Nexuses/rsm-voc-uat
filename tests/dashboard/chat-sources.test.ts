import { describe, expect, it } from "vitest";
import {
  buildThemeAttribution,
  finalizeChatAnswer,
  formatRespondentLabel,
  formatThemeAttributionContext,
  sourcesForMentionedThemes,
  toChatSource,
} from "@/lib/chat-sources";
import type { DashboardAnalyticsItem } from "@/lib/dashboard-analytics";

const analyticsItems: DashboardAnalyticsItem[] = [
  {
    responseId: "r1",
    submittedAt: "2026-06-12T10:00:00.000Z",
    company: "Acme Holdings",
    clientName: "Jane Doe",
    source: "typed",
    sentiment: "positive",
    metrics: { csat: 5, ces: 6, nps: 10 },
    keyDrivers: ["WhatsApp communication"],
    riskSignals: [],
    answers: [],
  },
  {
    responseId: "r2",
    submittedAt: "2026-06-10T10:00:00.000Z",
    company: "Beta Logistics",
    clientName: "John Smith",
    source: "voice",
    sentiment: "positive",
    metrics: { csat: 4, ces: 5, nps: 8 },
    keyDrivers: ["WhatsApp communication", "Responsiveness"],
    riskSignals: [],
    answers: [],
  },
];

describe("chat sources", () => {
  it("prefers company names for respondent labels", () => {
    expect(
      formatRespondentLabel({ name: "Jane Doe", company: "Acme Holdings" })
    ).toBe("Acme Holdings");
    expect(formatRespondentLabel({ name: "Jane Doe", company: null })).toBe(
      "Jane Doe"
    );
  });

  it("builds theme attribution with company names", () => {
    const attribution = buildThemeAttribution(analyticsItems);

    expect(attribution.get("WhatsApp communication")).toEqual([
      "Acme Holdings",
      "Beta Logistics",
    ]);
    expect(formatThemeAttributionContext(attribution)).toContain(
      "WhatsApp communication: Acme Holdings, Beta Logistics"
    );
  });

  it("replaces response ids and strips trailing source lines", () => {
    const sourcesById = new Map([
      [
        "r1",
        toChatSource({
          id: "r1",
          createdAt: new Date("2026-06-12T10:00:00.000Z"),
          client: { company: "Acme Holdings", name: "Jane Doe" },
        }),
      ],
    ]);

    const { answer, footerSources } = finalizeChatAnswer(
      "Lowest score from [response: r1].\n\nSources: [response: r1]",
      sourcesById,
      []
    );

    expect(answer).toBe("Lowest score from Acme Holdings.");
    expect(footerSources).toEqual([
      expect.objectContaining({ responseId: "r1", label: "Acme Holdings" }),
    ]);
  });

  it("collects companies for mentioned themes", () => {
    const attribution = buildThemeAttribution(analyticsItems);
    const sources = sourcesForMentionedThemes(
      "WhatsApp communication appears often.",
      attribution,
      analyticsItems
    );

    expect(sources.map((source) => source.label).sort()).toEqual([
      "Acme Holdings",
      "Beta Logistics",
    ]);
  });
});
