import crypto from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const email = "step11-cx@example.test";
const password = crypto.randomBytes(24).toString("base64url");
const runId = crypto.randomUUID();
const scrypt = promisify(crypto.scrypt);
const db = new PrismaClient();

function cookiesFrom(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";", 1)[0]).join("; ");
}

function mergeCookies(existing, incoming) {
  const cookies = new Map();
  for (const source of [existing, incoming]) {
    for (const pair of source.split(";").map((value) => value.trim())) {
      if (!pair) continue;
      const separator = pair.indexOf("=");
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }
  return [...cookies].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function hashPassword(value) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(value, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
}

async function signIn() {
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  let cookies = cookiesFrom(csrfResponse);
  const { csrfToken } = await csrfResponse.json();
  const response = await fetch(
    `${baseUrl}/api/auth/callback/credentials?json=true`,
    {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: cookies,
      },
      body: new URLSearchParams({
        csrfToken,
        email,
        password,
        callbackUrl: `${baseUrl}/dashboard`,
        json: "true",
      }),
    }
  );
  cookies = mergeCookies(cookies, cookiesFrom(response));
  return cookies;
}

function vectorAt(index) {
  return `[${Array.from({ length: 1536 }, (_, position) =>
    position === index ? 1 : 0
  ).join(",")}]`;
}

try {
  await db.user.create({
    data: {
      email,
      role: "cx",
      passwordHash: await hashPassword(password),
    },
  });

  const low = await db.response.create({
    data: {
      conversationId: `chat-${runId}-low`,
      language: "en",
      avgRating: 1,
      answers: [
        {
          question_number: 1,
          rating: 1,
          reason_text: "The response took too long and required repeated follow-up.",
        },
      ],
      rawPayload: { fixture: "chat", runId },
      client: {
        create: {
          name: "Lowest Rating Contact",
          company: "Lowest Rating Company",
          locale: "en",
        },
      },
      insight: {
        create: {
          overallSentiment: "negative",
          satisfactionSummary:
            "The client is dissatisfied because the response took too long.",
          keyDrivers: ["slow response time"],
          riskSignals: ["follow-up required"],
          suggestedReply: { en: "Acknowledge the delay.", ar: "" },
          nextSteps: ["Contact the client promptly"],
          modelVersion: "chat-fixture",
        },
      },
    },
  });

  const high = await db.response.create({
    data: {
      conversationId: `chat-${runId}-high`,
      language: "en",
      avgRating: 5,
      answers: [
        {
          question_number: 1,
          rating: 5,
          reason_text: "The team responded promptly and clearly.",
        },
      ],
      rawPayload: { fixture: "chat", runId },
      client: {
        create: {
          name: "Highest Rating Contact",
          company: "Highest Rating Company",
          locale: "en",
        },
      },
      insight: {
        create: {
          overallSentiment: "positive",
          satisfactionSummary:
            "The client is satisfied with the prompt and clear response.",
          keyDrivers: ["prompt response"],
          riskSignals: [],
          suggestedReply: { en: "Thank the client.", ar: "" },
          nextSteps: ["Maintain service level"],
          modelVersion: "chat-fixture",
        },
      },
    },
  });

  for (const [response, vector] of [
    [low, vectorAt(0)],
    [high, vectorAt(1)],
  ]) {
    await db.$executeRawUnsafe(
      `INSERT INTO "ResponseEmbedding" (id, "responseId", content, embedding, "createdAt")
       VALUES ($1, $2, $3, $4::vector, NOW())`,
      crypto.randomUUID(),
      response.id,
      `Chat verification content for ${response.conversationId}`,
      vector
    );
  }

  const anonymous = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      question: "Which client gave the lowest rating and why?",
    }),
  });
  console.log(`Anonymous POST /api/chat: ${anonymous.status}`);

  const cookies = await signIn();
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookies,
    },
    body: JSON.stringify({
      question: "Which client gave the lowest rating and why?",
    }),
  });
  console.log(`Authenticated POST /api/chat: ${response.status}`);
  if (response.status !== 200) {
    throw new Error(`Expected authenticated chat status 200, received ${response.status}`);
  }

  const body = await response.json();
  console.log(`Returned sources: ${body.sources?.length ?? 0}`);
  console.log(`Lowest response ID: ${low.id}`);

  if (anonymous.status !== 401) {
    throw new Error(`Expected anonymous chat status 401, received ${anonymous.status}`);
  }
  if (
    !Array.isArray(body.sources) ||
    !body.sources.some(
      (source) =>
        source &&
        typeof source === "object" &&
        source.responseId === low.id
    )
  ) {
    throw new Error("Chat sources did not include the lowest-rated response");
  }
  const lowestSource = body.sources.find(
    (source) => source?.responseId === low.id
  );
  if (
    typeof body.answer !== "string" ||
    !body.answer.includes(lowestSource?.label ?? "Lowest Rating Company")
  ) {
    throw new Error("Chat answer did not cite the lowest-rated company");
  }

  const dashboard = await fetch(`${baseUrl}/dashboard`, {
    headers: { cookie: cookies },
  });
  const dashboardHtml = await dashboard.text();
  console.log(`Authenticated GET /dashboard: ${dashboard.status}`);
  if (
    dashboard.status !== 200 ||
    !dashboardHtml.includes("Ask about the dashboard data")
  ) {
    throw new Error("Dashboard does not render the chatbot panel");
  }

  console.log("PASS chatbot cites the real lowest-rated response");
  console.log("PASS dashboard renders the chatbot panel");
} finally {
  await db.response.deleteMany({
    where: { conversationId: { startsWith: `chat-${runId}-` } },
  });
  await db.client.deleteMany({
    where: {
      company: { in: ["Lowest Rating Company", "Highest Rating Company"] },
    },
  });
  await db.user.deleteMany({ where: { email } });
  await db.$disconnect();
}
