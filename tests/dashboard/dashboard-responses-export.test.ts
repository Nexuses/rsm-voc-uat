import { describe, expect, it } from "vitest";
import type { DashboardInsight } from "@/components/dashboard/types";
import {
  clientHistoryKey,
  dashboardInsightsToCsv,
  dashboardInsightsToExcel,
  groupDashboardInsightsByClient,
  groupDashboardInsightsByEmail,
  matchesDashboardInsightSearch,
  sortDashboardInsightsByRecency,
} from "@/lib/dashboard-responses-export";

const insight = (
  overrides: Partial<DashboardInsight> & {
    responseId: string;
    client?: DashboardInsight["client"];
  }
): DashboardInsight => ({
  conversationId: `typed_${overrides.responseId}`,
  source: "typed",
  language: "en",
  submittedAt: "2026-06-12T10:05:00.000Z",
  department: "ASSURANCE",
  partner: "Sriram Gopalakrishnan",
  surveyVersion: "voc-v2",
  metrics: { csat: 4, ces: 6, nps: 9 },
  avgRating: 4,
  sentiment: "positive",
  summary: null,
  keyDrivers: [],
  riskSignals: [],
  suggestedReply: {},
  nextSteps: [],
  answers: [
    {
      questionNumber: 1,
      question: "CSAT",
      metric: "csat",
      scaleMin: 1,
      scaleMax: 5,
      rating: 4,
      comments: "Clear communication.",
      method: "typed",
    },
  ],
  client: { name: "Noor Al-Sabah", company: "Example Co" },
  ...overrides,
});

describe("dashboard responses export and grouping", () => {
  it("groups by email when present and otherwise by name plus company", () => {
    const withEmail = insight({
      responseId: "1",
      client: {
        name: "Noor Al-Sabah",
        company: "Example Co",
        email: "Noor@Example.com",
      },
    });
    const sameEmail = insight({
      responseId: "2",
      submittedAt: "2026-05-01T10:00:00.000Z",
      client: {
        name: "Noor",
        company: "Other Co",
        email: "noor@example.com",
      },
    });
    const byName = insight({
      responseId: "3",
      client: { name: "Omar Ali", company: "Acme" },
    });

    expect(clientHistoryKey(withEmail)).toBe("email:noor@example.com");
    const groups = groupDashboardInsightsByClient([withEmail, sameEmail, byName]);
    expect(groups).toHaveLength(2);
    expect(groups[0].items.map((item) => item.responseId)).toEqual(["1", "2"]);
    expect(groups[1].key).toBe("name:omar ali|company:acme");
  });

  it("groups strictly by email and buckets missing emails together", () => {
    const withEmail = insight({
      responseId: "1",
      client: {
        name: "Noor",
        company: "Example Co",
        email: "noor@example.com",
      },
    });
    const noEmailA = insight({
      responseId: "2",
      client: { name: "Ikanj", company: "Nexuses" },
    });
    const noEmailB = insight({
      responseId: "3",
      client: { name: "Ekanj", company: "Nexus" },
    });

    const groups = groupDashboardInsightsByEmail([withEmail, noEmailA, noEmailB]);
    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.key === "email:noor@example.com")?.items).toHaveLength(
      1
    );
    expect(groups.find((group) => group.key === "email:none")?.items).toHaveLength(2);
  });

  it("matches response search across email, name, and company", () => {
    const item = insight({
      responseId: "1",
      client: {
        name: "Noor Al-Sabah",
        company: "Example Co",
        email: "noor@example.com",
      },
    });

    expect(matchesDashboardInsightSearch(item, "noor@")).toBe(true);
    expect(matchesDashboardInsightSearch(item, "example")).toBe(true);
    expect(matchesDashboardInsightSearch(item, "missing")).toBe(false);
  });

  it("builds a CSV of the filtered response rows", () => {
    const csv = dashboardInsightsToCsv([
      insight({
        responseId: "1",
        client: {
          name: "Noor Al-Sabah",
          company: "Example Co",
          designation: "CFO",
          email: "noor@example.com",
        },
      }),
    ]);

    expect(csv).toContain(
      "submittedAt,name,company,designation,email,source,csat,ces,nps,comments,department,partner,sentiment"
    );
    expect(csv).toContain("noor@example.com");
    expect(csv).toContain("CSAT: Clear communication.");
    expect(csv).toContain("ASSURANCE");
  });

  it("sorts responses by submitted time descending", () => {
    const older = insight({
      responseId: "1",
      submittedAt: "2026-06-12T10:05:00.000Z",
    });
    const newer = insight({
      responseId: "2",
      submittedAt: "2026-06-12T11:05:00.000Z",
    });

    expect(
      sortDashboardInsightsByRecency([older, newer]).map((item) => item.responseId)
    ).toEqual(["2", "1"]);
  });

  it("builds SpreadsheetML Excel with the same response columns", () => {
    const excel = dashboardInsightsToExcel([
      insight({
        responseId: "1",
        client: {
          name: "Noor Al-Sabah",
          company: "Example Co",
          designation: "CFO",
          email: "noor@example.com",
        },
      }),
    ]);

    expect(excel).toContain('ss:Name="Responses"');
    expect(excel).toContain("noor@example.com");
    expect(excel).toContain("<Data ss:Type=\"Number\">4</Data>");
    expect(excel).toContain("CSAT: Clear communication.");
  });
});
