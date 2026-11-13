import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DATABASE_UNAVAILABLE_MESSAGE } from "@/lib/prisma-errors";
import { SURVEY_QUESTIONS, SURVEY_VERSION } from "@/lib/survey/constants";

const mocks = vi.hoisted(() => ({
  requireCxUser: vi.fn(),
  responseFindMany: vi.fn(),
  getSessionPermissions: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireCxUser: mocks.requireCxUser,
  requireAnyPermission: mocks.requireCxUser,
  getSessionPermissions: mocks.getSessionPermissions,
  isCxAuthError: () => false,
  isCxPermissionError: () => false,
}));

vi.mock("@/lib/authz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authz")>();
  return {
    ...actual,
    loadAuthzContext: async () =>
      actual.buildAuthzContext({
        userId: "cx-1",
        permissions: await mocks.getSessionPermissions(),
        scopes: [],
      }),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    response: {
      findMany: mocks.responseFindMany,
    },
  },
}));

import { GET } from "@/app/api/insights/route";

function request(query = "") {
  return new NextRequest(
    `https://rsm-voc-platform.vercel.app/api/insights${query}`
  );
}

const responseWithoutInsight = {
  id: "response-1",
  conversationId: "typed_123",
  language: "en",
  avgRating: 4,
  surveyVersion: SURVEY_VERSION,
  csatScore: 4,
  cesScore: 6,
  npsScore: 9,
  answers: [
    {
      question_number: 1,
      question_text: SURVEY_QUESTIONS[0].question,
      metric: "csat",
      scale_min: 1,
      scale_max: 5,
      rating: 4,
      reason_text: "Clear communication.",
      reason_method: "typed",
    },
  ],
  rawPayload: { source: "typed" },
  completedAt: new Date("2026-06-12T10:05:00.000Z"),
  createdAt: new Date("2026-06-12T10:00:00.000Z"),
  client: {
    name: "Noor Al-Sabah",
    company: "Example Co",
    designation: "Finance Director",
    tier: null,
    email: "noor@example.com",
  },
  insight: null,
  surveyInvite: null,
};

describe("CX response API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCxUser.mockResolvedValue({ user: { id: "cx-1" } });
    mocks.responseFindMany.mockResolvedValue([responseWithoutInsight]);
    mocks.getSessionPermissions.mockResolvedValue(["dashboard.responses"]);
  });

  it("hides contact email from roles without response access", async () => {
    mocks.getSessionPermissions.mockResolvedValue(["dashboard.insights"]);

    const body = await (await GET(request())).json();

    expect(body[0].client).toEqual(
      expect.objectContaining({ name: "Noor Al-Sabah", email: null })
    );
  });

  it("returns every stored response even when GPT enrichment is pending", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({
        responseId: "response-1",
        conversationId: "typed_123",
        source: "typed",
        language: "en",
        submittedAt: "2026-06-12T10:05:00.000Z",
        department: null,
        partner: null,
        client: {
          name: "Noor Al-Sabah",
          company: "Example Co",
          designation: "Finance Director",
          email: "noor@example.com",
          tier: null,
        },
        surveyVersion: SURVEY_VERSION,
        metrics: { csat: 4, ces: 6, nps: 9 },
        // 19/22 combined → positive even before GPT enrichment exists.
        sentiment: "positive",
        summary: null,
        answers: [
          {
            questionNumber: 1,
            question: SURVEY_QUESTIONS[0].question,
            metric: "csat",
            scaleMin: 1,
            scaleMax: 5,
            rating: 4,
            comments: "Clear communication.",
            method: "typed",
          },
        ],
      }),
    ]);
  });

  it("returns invite department and partner metadata when present", async () => {
    mocks.responseFindMany.mockResolvedValue([
      {
        ...responseWithoutInsight,
        surveyInvite: {
          department: "ASSURANCE",
          partner: "Sriram Gopalakrishnan",
        },
      },
    ]);

    const response = await GET(request());
    const body = await response.json();

    expect(body[0]).toEqual(
      expect.objectContaining({
        department: "ASSURANCE",
        partner: "Sriram Gopalakrishnan",
      })
    );
  });

  it("applies sentiment and risk filters after loading responses", async () => {
    mocks.responseFindMany.mockResolvedValue([
      responseWithoutInsight,
      {
        ...responseWithoutInsight,
        id: "response-2",
        conversationId: "voice-2",
        // 6/22 combined → negative regardless of the stored GPT label.
        csatScore: 1,
        cesScore: 2,
        npsScore: 3,
        insight: {
          overallSentiment: "negative",
          satisfactionSummary: "Follow-up is needed.",
          keyDrivers: ["timeliness"],
          riskSignals: ["churn risk"],
          suggestedReply: { en: "We will follow up." },
          nextSteps: ["Call client"],
        },
      },
    ]);

    const negative = await (await GET(request("?sentiment=negative"))).json();
    const risk = await (await GET(request("?risk=true"))).json();

    expect(negative.map((item: { responseId: string }) => item.responseId))
      .toEqual(["response-2"]);
    expect(risk.map((item: { responseId: string }) => item.responseId))
      .toEqual(["response-2"]);
  });

  it("returns 503 when the database connection drops", async () => {
    mocks.responseFindMany.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        "Server has closed the connection.",
        {
          code: "P1017",
          clientVersion: "6.19.3",
        }
      )
    );

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe(DATABASE_UNAVAILABLE_MESSAGE);
  });
});
