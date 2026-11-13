import { describe, expect, it } from "vitest";
import { mapCxResponseToDashboardInsight } from "@/lib/cx-insights-map";
import type { CxInsightResponse } from "@/lib/cx-response-select";

function baseResponse(
  overrides: Partial<CxInsightResponse> = {}
): CxInsightResponse {
  return {
    id: "resp-1",
    conversationId: "conv_voice_1",
    surveyVersion: "voc-v2",
    csatScore: 5,
    cesScore: 7,
    npsScore: 10,
    language: "en",
    avgRating: 5,
    answers: [],
    completedAt: new Date("2026-09-21T08:00:00.000Z"),
    createdAt: new Date("2026-09-21T08:00:00.000Z"),
    client: {
      name: "Ekansh",
      company: "Nexuses",
      designation: "Developer",
      email: null,
      tier: null,
    },
    insight: null,
    surveyInvite: {
      department: null,
      partner: null,
      serviceName: null,
      businessManagerName: null,
      jobManagerName: null,
      email: "ekansh@example.com",
    },
    ...overrides,
  };
}

describe("cx insights email mapping", () => {
  it("falls back to tracked invite email when voice client has no email", () => {
    const mapped = mapCxResponseToDashboardInsight(baseResponse());
    expect(mapped.client?.email).toBe("ekansh@example.com");
    expect(mapped.source).toBe("voice");
  });

  it("prefers client email when both are present", () => {
    const mapped = mapCxResponseToDashboardInsight(
      baseResponse({
        client: {
          name: "Ekansh",
          company: "Nexuses",
          designation: "Developer",
          email: "typed@example.com",
          tier: null,
        },
      })
    );
    expect(mapped.client?.email).toBe("typed@example.com");
  });
});
