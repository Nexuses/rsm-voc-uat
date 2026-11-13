import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PublicVocReport from "@/components/reports/PublicVocReport";

describe("public VOC report page", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            period: "all-time",
            latestPeriod: "2026-06",
            totalResponses: 5,
            csat: {
              score: 4.6,
              favorablePercent: 80,
              responseCount: 5,
              scale: { min: 1, max: 5 },
              distribution: { "1": 0, "2": 0, "3": 1, "4": 0, "5": 4 },
            },
            ces: {
              score: 5.6,
              favorablePercent: 80,
              responseCount: 5,
              scale: { min: 1, max: 7 },
              distribution: {
                "1": 0,
                "2": 0,
                "3": 0,
                "4": 1,
                "5": 0,
                "6": 3,
                "7": 1,
              },
            },
            nps: {
              score: 40,
              promoterPercent: 60,
              passivePercent: 20,
              detractorPercent: 20,
              responseCount: 5,
              distribution: {
                "0": 0,
                "1": 0,
                "2": 0,
                "3": 1,
                "4": 0,
                "5": 0,
                "6": 0,
                "7": 1,
                "8": 0,
                "9": 2,
                "10": 1,
              },
            },
            trend: [
              {
                period: "2026-05",
                csat: { score: 4, favorablePercent: 50, responseCount: 2 },
                ces: { score: 5, favorablePercent: 50, responseCount: 2 },
                nps: {
                  score: 50,
                  promoterPercent: 50,
                  passivePercent: 50,
                  detractorPercent: 0,
                  responseCount: 2,
                },
              },
              {
                period: "2026-06",
                csat: { score: 5, favorablePercent: 100, responseCount: 3 },
                ces: { score: 6, favorablePercent: 100, responseCount: 3 },
                nps: {
                  score: 33.33,
                  promoterPercent: 66.67,
                  passivePercent: 0,
                  detractorPercent: 33.33,
                  responseCount: 3,
                },
              },
            ],
            themes: [
              {
                label: "Responsiveness",
                sentiment: "positive",
                mentions: 4,
                summary: "Clients value timely communication.",
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        )
      )
    );
  });

  it("renders public headline metrics and sanitized themes", async () => {
    render(<PublicVocReport />);

    const metrics = await screen.findByLabelText("Experience metrics");
    expect(within(metrics).getByText("CSAT")).toBeVisible();
    expect(within(metrics).getByText("CES")).toBeVisible();
    expect(within(metrics).getByText("NPS")).toBeVisible();
    expect(within(metrics).getByText("4.6/5")).toBeVisible();
    expect(within(metrics).getByText("5.6/7")).toBeVisible();
    expect(within(metrics).getByText("40")).toBeVisible();
    expect(screen.getByRole("img", { name: /rsm in kuwait/i })).toBeVisible();
    expect(screen.getByText("Responsiveness")).toBeVisible();
    expect(screen.getByText("Clients value timely communication.")).toBeVisible();
    expect(screen.getByText("NPS distribution")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /take the client survey/i })
    ).toHaveAttribute("href", "/survey");
    expect(screen.queryByText("Noor Al-Sabah")).not.toBeInTheDocument();
    expect(screen.queryByText("Example Co")).not.toBeInTheDocument();
  });
});
