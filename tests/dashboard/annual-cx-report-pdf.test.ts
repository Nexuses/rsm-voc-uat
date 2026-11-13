import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import { buildDashboardReport } from "@/lib/dashboard-analytics";
import {
  annualCxReportFilename,
  renderAnnualCxReportPdf,
} from "@/lib/annual-cx-report-pdf";
import {
  buildAnnualCxComparison,
  resolveAnnualCxPeriodPlan,
} from "@/lib/annual-cx-report-period";

describe("annual CX report PDF", () => {
  const sampleItems = [
    {
      responseId: "r1",
      submittedAt: "2026-06-01T10:00:00.000Z",
      company: "Example Co",
      clientName: "Noor",
      source: "voice" as const,
      sentiment: "positive" as const,
      metrics: { csat: 5, ces: 6, nps: 10 },
      keyDrivers: ["Communication"],
      riskSignals: [],
      answers: [
        { questionNumber: 1, metric: "csat" as const, rating: 5 },
        { questionNumber: 2, metric: "ces" as const, rating: 6 },
        { questionNumber: 3, metric: "nps" as const, rating: 10 },
      ],
    },
    {
      responseId: "r2",
      submittedAt: "2026-06-10T11:00:00.000Z",
      company: "Example Co",
      clientName: "Fahad",
      source: "typed" as const,
      sentiment: "negative" as const,
      metrics: { csat: 2, ces: 3, nps: 4 },
      keyDrivers: ["Communication"],
      riskSignals: ["Escalation risk"],
      answers: [
        { questionNumber: 1, metric: "csat" as const, rating: 2 },
        { questionNumber: 2, metric: "ces" as const, rating: 3 },
        { questionNumber: 3, metric: "nps" as const, rating: 4 },
      ],
    },
  ];

  it("renders twelve pages and a dated filename", () => {
    const plan = resolveAnnualCxPeriodPlan(
      "year",
      new Date("2026-10-19T12:00:00.000Z")
    );
    const currentReport = buildDashboardReport(sampleItems);
    const priorReport = buildDashboardReport([]);
    const currentOutreach = {
      surveysSent: 4,
      responsesReceived: 2,
      responseRate: 50,
      opensTracked: 3,
      startsTracked: 2,
    };
    const priorOutreach = {
      surveysSent: 0,
      responsesReceived: 0,
      responseRate: 0,
      opensTracked: 0,
      startsTracked: 0,
    };
    const comparison = buildAnnualCxComparison({
      currentReport,
      priorReport,
      currentOutreach,
      priorOutreach,
      currentResponseCount: sampleItems.length,
      priorResponseCount: 0,
    });

    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    renderAnnualCxReportPdf(doc, {
      plan,
      currentReport,
      priorReport,
      currentOutreach,
      priorOutreach,
      comparison,
      responseCount: sampleItems.length,
      // Sample quotes are test fixtures only; production uses published,
      // consented testimonials selected as the best 2 per metric.
      quotes: [
        {
          id: "q1",
          text: "The team was responsive and clear throughout the engagement.",
          respondentName: "Noor",
          company: "Example Co",
          showAttribution: true,
          metric: "csat" as const,
        },
        {
          id: "q2",
          text: "I would recommend RSM to colleagues without hesitation.",
          respondentName: "Fahad",
          company: "Example Co",
          showAttribution: true,
          metric: "nps" as const,
        },
        {
          id: "q3",
          text: "Getting the service and support we needed was straightforward.",
          respondentName: "Sara",
          company: "Example Co",
          showAttribution: false,
          metric: "ces" as const,
        },
        {
          id: "q4",
          text: "Communication stayed clear from start to finish.",
          respondentName: "Noor",
          company: "Example Co",
          showAttribution: true,
          metric: "csat" as const,
        },
        {
          id: "q5",
          text: "A trusted team I am happy to recommend to other businesses.",
          respondentName: "Omar",
          company: "Example Co",
          showAttribution: true,
          metric: "nps" as const,
        },
        {
          id: "q6",
          text: "Requests were handled with very little effort on our side.",
          respondentName: "Laila",
          company: "Example Co",
          showAttribution: true,
          metric: "ces" as const,
        },
      ],
      logo: null,
      coverImage: null,
      generatedAt: new Date("2026-10-19T12:00:00.000Z"),
      aiNarrative: {
        executiveSummary:
          "RSM in Kuwait recorded steady results across CSAT, CES and NPS for the period.",
        csatNarrative: "CSAT remained favourable across the period.",
        cesNarrative: "CES indicated clients generally found it easy to work with us.",
        npsNarrative: "NPS reflected a base of client advocates.",
        voiceOfClientThemes: "Clients highlighted clear communication.",
        outlook: "We aim to sustain service quality through consistent delivery.",
      },
    });

    expect(doc.getNumberOfPages()).toBe(12);
    expect(
      annualCxReportFilename(plan, new Date("2026-10-19T12:00:00.000Z"))
    ).toBe("rsm-cx-annual-report-year-2026-10-19.pdf");
  });
});
