import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { recomputeAggregates } from "../lib/aggregate";
import {
  buildEmbeddingContent,
  embedText,
  type Answer,
  type Insight,
} from "../lib/insight";
import { hashPassword } from "../lib/password";
import {
  SURVEY_QUESTIONS,
  SURVEY_VERSION,
} from "../lib/survey/constants";

const db = new PrismaClient();

type SeedScenario = {
  id: "happy" | "unhappy" | "neutral" | "go-back";
  clientName: string;
  company: string;
  designation: string;
  csat: number;
  ces: number;
  nps: number;
  reason: string;
  insight: Insight;
};

const scenarios: SeedScenario[] = [
  {
    id: "happy",
    clientName: "Sample Happy Contact",
    company: "Sample Assurance Client",
    designation: "Finance Director",
    csat: 5,
    ces: 7,
    nps: 10,
    reason: "Communication was clear and the team responded promptly.",
    insight: {
      overallSentiment: "positive",
      satisfactionSummary:
        "The client is highly satisfied with clear communication and prompt responses.",
      keyDrivers: ["clear communication", "prompt responses"],
      riskSignals: [],
      suggestedReply: {
        en: "Thank the client and confirm the team will maintain this service level.",
      },
      nextSteps: ["Share the positive feedback with the engagement team"],
    },
  },
  {
    id: "unhappy",
    clientName: "Sample Unhappy Contact",
    company: "Sample Tax Client",
    designation: "Tax Manager",
    csat: 1,
    ces: 2,
    nps: 3,
    reason: "Updates arrived late and required repeated follow-up.",
    insight: {
      overallSentiment: "negative",
      satisfactionSummary:
        "The client is dissatisfied with delayed updates and repeated follow-up.",
      keyDrivers: ["delayed updates", "repeated follow-up"],
      riskSignals: ["relationship risk"],
      suggestedReply: {
        en: "Acknowledge the delays and arrange a prompt follow-up with clear ownership.",
      },
      nextSteps: ["Assign an owner", "Contact the client promptly"],
    },
  },
  {
    id: "neutral",
    clientName: "Sample Neutral Contact",
    company: "Sample Advisory Client",
    designation: "Operations Director",
    csat: 3,
    ces: 4,
    nps: 7,
    reason: "The work met expectations, with room for more proactive updates.",
    insight: {
      overallSentiment: "neutral",
      satisfactionSummary:
        "The client feels the work met expectations but wants more proactive updates.",
      keyDrivers: ["met expectations", "proactive updates needed"],
      riskSignals: [],
      suggestedReply: {
        en: "Thank the client and confirm a more proactive update cadence.",
      },
      nextSteps: ["Agree an update cadence with the client"],
    },
  },
  {
    id: "go-back",
    clientName: "Sample Revised Contact",
    company: "Sample Consulting Client",
    designation: "Managing Director",
    csat: 4,
    ces: 6,
    nps: 9,
    reason:
      "After clarification, the client revised the response and confirmed the issue was resolved.",
    insight: {
      overallSentiment: "positive",
      satisfactionSummary:
        "The client revised the response after clarification and confirmed the issue was resolved.",
      keyDrivers: ["effective clarification", "issue resolved"],
      riskSignals: [],
      suggestedReply: {
        en: "Thank the client for confirming the resolution and keep the follow-up documented.",
      },
      nextSteps: ["Document the resolution"],
    },
  },
];

async function seedScenario(scenario: SeedScenario) {
  const conversationId = `seed-${scenario.id}`;
  const completedAt = new Date();
  const answers: Answer[] = [
    {
      question_number: 1,
      question_text: SURVEY_QUESTIONS[0].question,
      metric: "csat",
      scale_min: 1,
      scale_max: 5,
      rating: scenario.csat,
      reason_text: scenario.reason,
    },
    {
      question_number: 2,
      question_text: SURVEY_QUESTIONS[1].question,
      metric: "ces",
      scale_min: 1,
      scale_max: 7,
      rating: scenario.ces,
      reason_text: scenario.reason,
    },
    {
      question_number: 3,
      question_text: SURVEY_QUESTIONS[2].question,
      metric: "nps",
      scale_min: 0,
      scale_max: 10,
      rating: scenario.nps,
      reason_text: scenario.reason,
    },
  ];
  const existing = await db.response.findUnique({
    where: { conversationId },
    select: { id: true, clientId: true },
  });

  let clientId = existing?.clientId;
  if (clientId) {
    await db.client.update({
      where: { id: clientId },
      data: {
        name: scenario.clientName,
        company: scenario.company,
        designation: scenario.designation,
        locale: "en",
      },
    });
  } else {
    const client = await db.client.create({
      data: {
        name: scenario.clientName,
        company: scenario.company,
        designation: scenario.designation,
        locale: "en",
      },
    });
    clientId = client.id;
  }

  const response = await db.response.upsert({
    where: { conversationId },
    update: {
      clientId,
      language: "en",
      surveyVersion: SURVEY_VERSION,
      avgRating: scenario.csat,
      csatScore: scenario.csat,
      cesScore: scenario.ces,
      npsScore: scenario.nps,
      answers,
      rawPayload: { sampleScenario: scenario.id },
      completedAt,
    },
    create: {
      conversationId,
      clientId,
      language: "en",
      surveyVersion: SURVEY_VERSION,
      avgRating: scenario.csat,
      csatScore: scenario.csat,
      cesScore: scenario.ces,
      npsScore: scenario.nps,
      answers,
      rawPayload: { sampleScenario: scenario.id },
      completedAt,
    },
  });

  await db.responseInsight.upsert({
    where: { responseId: response.id },
    update: {
      overallSentiment: scenario.insight.overallSentiment,
      satisfactionSummary: scenario.insight.satisfactionSummary,
      keyDrivers: scenario.insight.keyDrivers,
      riskSignals: scenario.insight.riskSignals,
      suggestedReply: scenario.insight.suggestedReply,
      nextSteps: scenario.insight.nextSteps,
      modelVersion: "seed-v1",
    },
    create: {
      responseId: response.id,
      overallSentiment: scenario.insight.overallSentiment,
      satisfactionSummary: scenario.insight.satisfactionSummary,
      keyDrivers: scenario.insight.keyDrivers,
      riskSignals: scenario.insight.riskSignals,
      suggestedReply: scenario.insight.suggestedReply,
      nextSteps: scenario.insight.nextSteps,
      modelVersion: "seed-v1",
    },
  });

  const content = buildEmbeddingContent(answers, scenario.insight, {
    fullName: scenario.clientName,
    company: scenario.company,
    designation: scenario.designation,
  });
  const existingEmbedding = await db.responseEmbedding.findUnique({
    where: { responseId: response.id },
    select: { content: true },
  });
  if (existingEmbedding?.content === content) return;

  const embedding = await embedText(content);
  await db.$executeRawUnsafe(
    `INSERT INTO "ResponseEmbedding" (id, "responseId", content, embedding, "createdAt")
     VALUES ($1, $2, $3, $4::vector, NOW())
     ON CONFLICT ("responseId") DO UPDATE
     SET content = EXCLUDED.content,
         embedding = EXCLUDED.embedding,
         "createdAt" = NOW()`,
    randomUUID(),
    response.id,
    content,
    `[${embedding.join(",")}]`
  );
}

async function seedCxUser() {
  const email = process.env.CX_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.CX_SEED_PASSWORD;
  if (!email && !password) return;
  if (!email || !password) {
    throw new Error(
      "Set both CX_SEED_EMAIL and CX_SEED_PASSWORD to seed a CX user"
    );
  }

  const { ensureSystemRoles } = await import("../lib/rbac/roles");
  const { cx } = await ensureSystemRoles();

  await db.user.upsert({
    where: { email },
    update: {
      role: "cx",
      roleId: cx.id,
      passwordHash: await hashPassword(password),
    },
    create: {
      email,
      role: "cx",
      roleId: cx.id,
      passwordHash: await hashPassword(password),
    },
  });
}

async function main() {
  for (const scenario of scenarios) {
    await seedScenario(scenario);
  }
  await seedCxUser();
  await recomputeAggregates();
  console.log(`Seeded ${scenarios.length} Voice of Clients scenarios.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
