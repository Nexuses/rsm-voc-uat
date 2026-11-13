import crypto from "node:crypto";
import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;

if (!secret) {
  throw new Error("ELEVENLABS_WEBHOOK_SECRET is required");
}

const fixtureUrl = new URL(
  "../__fixtures__/elevenlabs-post-call-transcription.json",
  import.meta.url
);
const rawBody = await fs.readFile(fixtureUrl, "utf8");
const payload = JSON.parse(rawBody);
const conversationId = payload.data.conversation_id;
const timestamp = Math.floor(Date.now() / 1000).toString();
const digest = crypto
  .createHmac("sha256", secret)
  .update(`${timestamp}.${rawBody}`)
  .digest("hex");
const db = new PrismaClient();

try {
  await db.response.deleteMany({ where: { conversationId } });

  const webhookResponse = await fetch(
    `${baseUrl}/api/webhooks/elevenlabs`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "elevenlabs-signature": `t=${timestamp},v0=${digest}`,
      },
      body: rawBody,
    }
  );
  const responseBody = await webhookResponse.text();
  console.log(`POST fixture: ${webhookResponse.status} ${responseBody}`);
  if (webhookResponse.status !== 200) {
    throw new Error(`Webhook failed with status ${webhookResponse.status}`);
  }

  const response = await db.response.findUniqueOrThrow({
    where: { conversationId },
    select: { id: true },
  });
  const insight = await db.responseInsight.findUnique({
    where: { responseId: response.id },
    select: {
      overallSentiment: true,
      satisfactionSummary: true,
      modelVersion: true,
    },
  });
  const embeddings = await db.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count,
            COALESCE(MAX(vector_dims(embedding)), 0)::int AS dimensions
     FROM "ResponseEmbedding"
     WHERE "responseId" = $1`,
    response.id
  );
  const embedding = embeddings[0];

  console.log(`Insight rows: ${insight ? 1 : 0}`);
  console.log(`Embedding rows: ${embedding.count}`);
  console.log(`Embedding dimensions: ${embedding.dimensions}`);

  if (!insight) {
    throw new Error("Expected one ResponseInsight row");
  }
  if (embedding.count !== 1 || embedding.dimensions !== 1536) {
    throw new Error("Expected one 1536-dimensional ResponseEmbedding row");
  }

  console.log(`PASS insight stored with model ${insight.modelVersion}`);
  console.log("PASS 1536-dimensional embedding stored");
} finally {
  await db.$disconnect();
}
