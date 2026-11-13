import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SurveyReviewSummary, {
  type ReviewMetricSummary,
} from "@/components/survey/SurveyReviewSummary";

afterEach(cleanup);

const metrics: ReviewMetricSummary[] = [
  {
    metric: "csat",
    title: "Client Satisfaction Score (CSAT)",
    score: 4,
    min: 1,
    max: 5,
    label: "Satisfied",
    comment: "The audit team explained every finding clearly.",
  },
  {
    metric: "ces",
    title: "Customer Effort Score (CES)",
    score: 5,
    min: 1,
    max: 7,
    label: "Easy",
    comment: "",
  },
  {
    metric: "nps",
    title: "Net Promoter Score (NPS)",
    score: 9,
    min: 0,
    max: 10,
    label: "Promoters",
    comment: "",
  },
];

type SummaryProps = Parameters<typeof SurveyReviewSummary>[0];

function renderSummary(overrides: Partial<SummaryProps> = {}) {
  return render(
    <SurveyReviewSummary
      respondentLabel="Respondent"
      fullName="Khalid Al Sabah"
      email="khalid@example.com"
      company="Gulf Holdings"
      designation="Finance Director"
      noComment="No comment provided"
      metrics={metrics}
      {...overrides}
    />
  );
}

describe("survey review summary", () => {
  it("shows one card per metric with its score and band", () => {
    const { container } = renderSummary();
    const cards = container.querySelectorAll("article");
    expect(cards).toHaveLength(3);

    expect(screen.getByText("Client Satisfaction Score (CSAT)")).toBeTruthy();
    expect(screen.getByText("Customer Effort Score (CES)")).toBeTruthy();
    expect(screen.getByText("Net Promoter Score (NPS)")).toBeTruthy();

    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
    expect(screen.getAllByText("/ 5")).toHaveLength(1);
    expect(screen.getAllByText("/ 10")).toHaveLength(1);

    expect(screen.getByText("Satisfied").getAttribute("data-band")).toBe("high");
    expect(screen.getByText("Promoters").getAttribute("data-band")).toBe("high");
  });

  it("renders the CX report illustration for every metric", () => {
    const { container } = renderSummary();
    const sources = [...container.querySelectorAll("article img")].map((img) =>
      img.getAttribute("src")
    );
    expect(sources).toEqual(["/metrics/csat.png", "/metrics/ces.png", "/metrics/nps.png"]);
    expect(container.querySelectorAll("article svg")).toHaveLength(0);
  });

  it("falls back to the no-comment copy and flags it", () => {
    const { container } = renderSummary();
    const empty = [...container.querySelectorAll("p")].filter(
      (element) => element.getAttribute("data-empty") === "true"
    );
    expect(empty).toHaveLength(2);
    expect(empty[0]?.textContent).toBe("No comment provided");
  });

  it("shows the respondent identity once, above the metric cards", () => {
    renderSummary();
    expect(screen.getByText("Khalid Al Sabah")).toBeTruthy();
    expect(screen.getByText(/Finance Director/)).toBeTruthy();
    expect(screen.getByText(/Gulf Holdings/)).toBeTruthy();
    expect(screen.getByText("khalid@example.com")).toBeTruthy();
    expect(screen.getAllByText("Respondent")).toHaveLength(1);
  });

  it("marks a weak score as the low band", () => {
    renderSummary({
      metrics: [
        {
          metric: "csat",
          title: "Client Satisfaction Score (CSAT)",
          score: 1,
          min: 1,
          max: 5,
          label: "Dissatisfied",
          comment: "",
        },
      ],
    });
    expect(screen.getByText("Dissatisfied").getAttribute("data-band")).toBe("low");
  });

  it("keeps the metric order passed in", () => {
    const { container } = renderSummary();
    expect(
      [...container.querySelectorAll("article")].map((card) =>
        card.getAttribute("data-metric")
      )
    ).toEqual(["csat", "ces", "nps"]);
  });
});
