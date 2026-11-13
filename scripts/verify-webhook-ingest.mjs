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
const db = new PrismaClient();

function signature(body) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `t=${timestamp},v0=${digest}`;
}

async function postFixture() {
  const response = await fetch(`${baseUrl}/api/webhooks/elevenlabs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "elevenlabs-signature": signature(rawBody),
    },
    body: rawBody,
  });

  const text = await response.text();
  console.log(`POST fixture: ${response.status} ${text.slice(0, 200)}`);
  if (response.status !== 200) {
    throw new Error(`Expected webhook status 200, received ${response.status}`);
  }
}

try {
  await db.response.deleteMany({ where: { conversationId } });

  const invalidSignatureResponse = await fetch(
    `${baseUrl}/api/webhooks/elevenlabs`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "elevenlabs-signature": "t=0,v0=invalid",
      },
      body: rawBody,
    }
  );
  console.log(`POST invalid signature: ${invalidSignatureResponse.status}`);
  if (invalidSignatureResponse.status !== 401) {
    throw new Error(
      `Expected invalid signature status 401, received ${invalidSignatureResponse.status}`
    );
  }

  const malformedBody = "{";
  const malformedResponse = await fetch(
    `${baseUrl}/api/webhooks/elevenlabs`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "elevenlabs-signature": signature(malformedBody),
      },
      body: malformedBody,
    }
  );
  console.log(`POST malformed JSON: ${malformedResponse.status}`);
  if (malformedResponse.status !== 400) {
    throw new Error(
      `Expected malformed JSON status 400, received ${malformedResponse.status}`
    );
  }

  await postFixture();
  await postFixture();

  const rows = await db.response.findMany({
    where: { conversationId },
    select: {
      conversationId: true,
      avgRating: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
      surveyVersion: true,
      language: true,
      answers: true,
      rawPayload: true,
      startedAt: true,
      completedAt: true,
      client: {
        select: {
          name: true,
          company: true,
          designation: true,
        },
      },
    },
  });

  console.log(`Response rows: ${rows.length}`);
  if (rows.length !== 1) {
    throw new Error(`Expected one response row, found ${rows.length}`);
  }

  const [row] = rows;
  const answers = Array.isArray(row.answers) ? row.answers : [];
  if (
    row.avgRating !== 4 ||
    row.csatScore !== 4 ||
    row.cesScore !== 2 ||
    row.npsScore !== 8 ||
    row.surveyVersion !== "three-metric-v2" ||
    row.language !== "en" ||
    answers.length !== 3 ||
    row.client?.name !== "Fixture Contact" ||
    row.client.company !== "Fixture Company" ||
    row.client.designation !== "Finance Director" ||
    row.rawPayload?.data?.conversation_id !== conversationId
  ) {
    throw new Error("Stored response does not match the parsed fixture");
  }

  console.log("PASS invalid signature rejected");
  console.log("PASS malformed signed payload rejected");
  console.log("PASS signature accepted");
  console.log("PASS raw and parsed payload stored");
  console.log("PASS duplicate conversation_id remained one row");
} finally {
  await db.$disconnect();
}
