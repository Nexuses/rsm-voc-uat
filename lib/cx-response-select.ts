import type { Prisma } from "@prisma/client";

/** Dashboard/API reads — excludes raw webhook payloads (large JSONB). */
export const cxResponseInsightsSelect = {
  id: true,
  conversationId: true,
  surveyVersion: true,
  csatScore: true,
  cesScore: true,
  npsScore: true,
  language: true,
  avgRating: true,
  answers: true,
  completedAt: true,
  createdAt: true,
  client: {
    select: {
      name: true,
      company: true,
      designation: true,
      email: true,
      tier: true,
    },
  },
  insight: {
    select: {
      overallSentiment: true,
      satisfactionSummary: true,
      keyDrivers: true,
      riskSignals: true,
      suggestedReply: true,
      nextSteps: true,
    },
  },
  surveyInvite: {
    select: {
      department: true,
      partner: true,
      serviceName: true,
      businessManagerName: true,
      jobManagerName: true,
      email: true,
    },
  },
} satisfies Prisma.ResponseSelect;

export type CxInsightResponse = Prisma.ResponseGetPayload<{
  select: typeof cxResponseInsightsSelect;
}>;

export function getResponseSource(conversationId: string): "voice" | "typed" {
  return conversationId.startsWith("typed_") ? "typed" : "voice";
}
