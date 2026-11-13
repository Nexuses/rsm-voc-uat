import { describe, expect, it } from "vitest";
import {
  quoteMetric,
  selectQuotesPerMetric,
  type AnnualCxQuote,
} from "@/lib/testimonials/quotes";

function quote(id: string, metric: AnnualCxQuote["metric"]): AnnualCxQuote {
  return {
    id,
    text: `Quote ${id}`,
    respondentName: "Client",
    company: "Example Co",
    showAttribution: true,
    metric,
  };
}

describe("quoteMetric", () => {
  it("matches the metric whose favourable comment the text is based on", () => {
    const answers = [
      { question_number: 1, metric: "csat", reason_text: "Clear advice throughout." },
      { question_number: 2, metric: "ces", reason_text: "Easy to reach the team." },
      { question_number: 3, metric: "nps", reason_text: "Would recommend RSM." },
    ];
    expect(
      quoteMetric({
        text: "Clear advice throughout.",
        answers,
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
      })
    ).toBe("csat");
    expect(
      quoteMetric({
        text: "Would recommend RSM.",
        answers,
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
      })
    ).toBe("nps");
  });

  it("returns null when the matching metric was not scored favourably", () => {
    expect(
      quoteMetric({
        text: "Would recommend RSM.",
        answers: [{ question_number: 3, metric: "nps", reason_text: "Would recommend RSM." }],
        csatScore: 5,
        cesScore: 6,
        npsScore: 6,
      })
    ).toBeNull();
  });
});

describe("selectQuotesPerMetric", () => {
  it("keeps at most two per metric and interleaves CSAT, NPS, CES", () => {
    const selected = selectQuotesPerMetric([
      quote("c1", "csat"),
      quote("c2", "csat"),
      quote("c3", "csat"),
      quote("n1", "nps"),
      quote("e1", "ces"),
      quote("e2", "ces"),
    ]);
    expect(selected.map((item) => item.id)).toEqual(["c1", "n1", "e1", "c2", "e2"]);
  });

  it("fills remaining slots with unassigned quotes", () => {
    const selected = selectQuotesPerMetric([
      quote("c1", "csat"),
      quote("x1", null),
      quote("x2", null),
    ]);
    expect(selected.map((item) => item.id)).toEqual(["c1", "x1", "x2"]);
  });
});
