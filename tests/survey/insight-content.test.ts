import { describe, expect, it } from "vitest";
import {
  buildEmbeddingContent,
  parseInsight,
  type Answer,
} from "@/lib/insight";

const answers: Answer[] = [
  {
    question_number: 1,
    metric: "csat",
    scale_min: 1,
    scale_max: 5,
    rating: 4,
    reason_text: "Responsive engagement team",
  },
  {
    question_number: 2,
    metric: "ces",
    scale_min: 1,
    scale_max: 7,
    rating: 6,
  },
  {
    question_number: 3,
    metric: "nps",
    scale_min: 0,
    scale_max: 10,
    rating: 9,
    reason_text: "Strong technical advice",
  },
];

describe("insight and RAG content", () => {
  it("uses an English-only suggested reply contract", () => {
    expect(
      parseInsight({
        overallSentiment: "positive",
        satisfactionSummary: "The client values the service.",
        keyDrivers: ["responsiveness"],
        riskSignals: [],
        suggestedReply: { en: "Thank the client." },
        nextSteps: [],
      })
    ).toMatchObject({
      suggestedReply: { en: "Thank the client." },
    });
  });

  it("includes identity, metric type, scale, scores, and comments in embeddings", () => {
    const content = buildEmbeddingContent(
      answers,
      {
        overallSentiment: "positive",
        satisfactionSummary: "The client is satisfied.",
        keyDrivers: ["responsiveness"],
        riskSignals: [],
        suggestedReply: { en: "Thank the client." },
        nextSteps: [],
      },
      {
        fullName: "Noor Al-Sabah",
        company: "Example Co",
        designation: "Finance Director",
      }
    );

    expect(content).toContain("Noor Al-Sabah");
    expect(content).toContain("Example Co");
    expect(content).toContain("Finance Director");
    expect(content).toContain("CSAT (4/5)");
    expect(content).toContain("CES (6/7)");
    expect(content).toContain("NPS (9/10)");
    expect(content).toContain("Responsive engagement team");
  });
});
