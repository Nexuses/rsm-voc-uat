import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSurveyTranscriptView } from "@/lib/survey/transcript";

const fixture = JSON.parse(
  readFileSync(
    join(process.cwd(), "__fixtures__/elevenlabs-post-call-transcription.json"),
    "utf8"
  )
) as unknown;

describe("survey transcript", () => {
  it("includes voice turns and scored answers without the raw webhook", () => {
    const view = buildSurveyTranscriptView({
      csatScore: 4,
      cesScore: 2,
      npsScore: 8,
      answers: [
        { question_number: 1, reason_text: "The team was responsive." },
        { question_number: 2, reason_text: "The filing took longer than expected." },
        { question_number: 3, reason_text: "Call me at +965 1234 5678." },
      ],
      rawPayload: fixture,
    });

    expect(view.answers).toEqual([
      expect.objectContaining({ metric: "csat", score: 4, comment: "The team was responsive." }),
      expect.objectContaining({
        metric: "ces",
        score: 2,
        comment: "The filing took longer than expected.",
      }),
      expect.objectContaining({ metric: "nps", score: 8, comment: "Call me at [redacted]." }),
    ]);
    expect(view.turns).toEqual([
      { role: "agent", message: "Thank you for sharing your feedback." },
      {
        role: "user",
        message: "The team was responsive, but the filing took longer than expected.",
      },
    ]);

    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("agent_fixture");
    expect(serialized).not.toContain("conv_fixture_step5");
    expect(serialized).not.toContain("rawPayload");
    expect(serialized).not.toContain("client_company");
  });

  it("returns the three questions and no turns for a typed survey", () => {
    const view = buildSurveyTranscriptView({
      csatScore: 5,
      cesScore: 6,
      npsScore: 9,
      answers: [],
      rawPayload: { source: "typed" },
    });

    expect(view.answers).toHaveLength(3);
    expect(view.turns).toEqual([]);
  });
});