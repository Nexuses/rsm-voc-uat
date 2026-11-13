import { describe, expect, it } from "vitest";
import { SURVEY_QUESTIONS, SURVEY_VERSION } from "@/lib/survey/constants";
import { normalizeElevenLabsPayload } from "@/lib/elevenlabs/payload";

function payloadWith(
  dataCollection: Record<string, unknown>,
  metadata: Record<string, unknown> = {
    start_time_unix_secs: 1781168400,
    call_duration_secs: 120,
  }
) {
  return {
    type: "post_call_transcription",
    event_timestamp: 1781169000,
    data: {
      conversation_id: "conv_split_name",
      metadata,
      analysis: {
        data_collection_results: dataCollection,
      },
    },
  };
}

describe("ElevenLabs payload normalization", () => {
  it("normalizes identity and all three metric answers", () => {
    const normalized = normalizeElevenLabsPayload(
      payloadWith({
        client_name: { value: "Noor Al-Sabah" },
        client_company: { value: "Example Co" },
        client_designation: { value: "Finance Director" },
        language: { value: "en" },
        q1_rating: { value: "4" },
        q1_reason: { value: "Responsive team" },
        q2_rating: { value: 6 },
        q2_reason: { value: "Easy process" },
        q3_rating: { value: 9 },
        q3_reason: { value: "Would recommend" },
      })
    );

    expect(normalized).toMatchObject({
      source: "elevenlabs",
      conversationId: "conv_split_name",
      surveyVersion: SURVEY_VERSION,
      clientName: "Noor Al-Sabah",
      company: "Example Co",
      designation: "Finance Director",
      language: "en",
      answers: [
        {
          question_number: 1,
          question_text: SURVEY_QUESTIONS[0].question,
          metric: "csat",
          scale_min: 1,
          scale_max: 5,
          rating: 4,
          reason_text: "Responsive team",
          reason_method: "spoken",
        },
        {
          question_number: 2,
          question_text: SURVEY_QUESTIONS[1].question,
          metric: "ces",
          scale_min: 1,
          scale_max: 7,
          rating: 6,
          reason_text: "Easy process",
          reason_method: "spoken",
        },
        {
          question_number: 3,
          question_text: SURVEY_QUESTIONS[2].question,
          metric: "nps",
          scale_min: 0,
          scale_max: 10,
          rating: 9,
          reason_text: "Would recommend",
          reason_method: "spoken",
        },
      ],
    });
    expect(normalized.startedAt?.toISOString()).toBe(
      "2026-06-11T09:00:00.000Z"
    );
    expect(normalized.completedAt?.toISOString()).toBe(
      "2026-06-11T09:02:00.000Z"
    );
  });

  it("keeps legacy split-name payloads compatible", () => {
    const normalized = normalizeElevenLabsPayload(
      payloadWith({
        client_first_name: { value: "Legacy" },
        client_last_name: { value: "Contact" },
        client_company: { value: "Legacy Co" },
        q1_rating: { value: 5 },
      })
    );

    expect(normalized.clientName).toBe("Legacy Contact");
    expect(normalized.language).toBe("en");
  });

  it("stores partial voice responses without inventing missing metrics", () => {
    const normalized = normalizeElevenLabsPayload(
      payloadWith({
        q1_rating: { value: 4 },
        q3_rating: { value: 8 },
      })
    );

    expect(normalized.answers.map((answer) => answer.metric)).toEqual([
      "csat",
      "nps",
    ]);
  });

  it("rejects ratings outside each metric range", () => {
    expect(() =>
      normalizeElevenLabsPayload(
        payloadWith({ q1_rating: { value: 5.5 } })
      )
    ).toThrow("q1_rating must be an integer from 1 to 5");
    expect(() =>
      normalizeElevenLabsPayload(
        payloadWith({ q2_rating: { value: 8 } })
      )
    ).toThrow("q2_rating must be an integer from 1 to 7");
    expect(() =>
      normalizeElevenLabsPayload(
        payloadWith({ q3_rating: { value: -1 } })
      )
    ).toThrow("q3_rating must be an integer from 0 to 10");
  });

  it("uses explicit ISO timestamps before event timestamp fallback", () => {
    const normalized = normalizeElevenLabsPayload(
      payloadWith(
        { q1_rating: { value: 3 } },
        {
          start_time: "2026-06-11T09:00:00.000Z",
          end_time: "2026-06-11T09:06:00.000Z",
        }
      )
    );

    expect(normalized.startedAt?.toISOString()).toBe(
      "2026-06-11T09:00:00.000Z"
    );
    expect(normalized.completedAt?.toISOString()).toBe(
      "2026-06-11T09:06:00.000Z"
    );
  });
});
