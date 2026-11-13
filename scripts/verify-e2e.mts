import crypto from "node:crypto";
import fs from "node:fs/promises";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const { db } = await import("../lib/db");
const { recomputeAggregates } = await import("../lib/aggregate");
const { hashPassword } = await import("../lib/password");

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const configuredSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
if (!configuredSecret) {
  throw new Error("ELEVENLABS_WEBHOOK_SECRET is required");
}
const secret: string = configuredSecret;

const runId = crypto.randomUUID();
const conversationId = `e2e-${runId}`;
const email = `e2e-${runId}@example.test`;
const password = crypto.randomBytes(24).toString("base64url");
let createdClientId: string | null = null;

function signature(body: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `t=${timestamp},v0=${digest}`;
}

function cookiesFrom(response: Response) {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const values =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(
          (value): value is string => Boolean(value)
        );
  return values.map((value) => value.split(";", 1)[0]).join("; ");
}

function mergeCookies(existing: string, incoming: string) {
  const cookies = new Map<string, string>();
  for (const source of [existing, incoming]) {
    for (const pair of source.split(";").map((value) => value.trim())) {
      if (!pair) continue;
      const separator = pair.indexOf("=");
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }
  return [...cookies].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function signIn() {
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  let cookies = cookiesFrom(csrfResponse);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
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

try {
  const publicBeforeResponse = await fetch(
    `${baseUrl}/api/public/csat?verify=${runId}-before`
  );
  const publicBefore = (await publicBeforeResponse.json()) as {
    totalResponses: number;
  };

  const fixtureText = await fs.readFile(
    new URL(
      "../__fixtures__/elevenlabs-post-call-transcription.json",
      import.meta.url
    ),
    "utf8"
  );
  const fixture = JSON.parse(fixtureText);
  fixture.data.conversation_id = conversationId;
  fixture.data.analysis.data_collection_results.q1_rating.value = 1;
  fixture.data.analysis.data_collection_results.q2_rating.value = 1;
  fixture.data.analysis.data_collection_results.q3_rating.value = 0;
  const rawBody = JSON.stringify(fixture);

  const webhook = await fetch(`${baseUrl}/api/webhooks/elevenlabs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "elevenlabs-signature": signature(rawBody),
    },
    body: rawBody,
  });
  const webhookBody = (await webhook.json()) as {
    responseId?: string;
    error?: string;
  };
  console.log(`Webhook POST: ${webhook.status}`);
  if (webhook.status !== 200 || !webhookBody.responseId) {
    throw new Error(
      `Webhook failed: ${webhookBody.error ?? "missing response ID"}`
    );
  }

  const stored = await db.response.findUnique({
    where: { conversationId },
    include: { insight: true, embedding: true, client: true },
  });
  createdClientId = stored?.clientId ?? null;
  console.log(`Stored response: ${stored?.id ?? "missing"}`);
  console.log(`Insight present: ${Boolean(stored?.insight)}`);
  console.log(`Embedding present: ${Boolean(stored?.embedding)}`);
  if (
    !stored?.insight ||
    !stored.embedding ||
    stored.csatScore !== 1 ||
    stored.cesScore !== 1 ||
    stored.npsScore !== 0
  ) {
    throw new Error("Webhook did not create the insight and embedding");
  }

  const publicAfterResponse = await fetch(
    `${baseUrl}/api/public/csat?verify=${runId}-after`
  );
  const publicAfter = (await publicAfterResponse.json()) as {
    totalResponses: number;
  };
  console.log(
    `Public total responses: ${publicBefore.totalResponses} -> ${publicAfter.totalResponses}`
  );
  if (publicAfter.totalResponses !== publicBefore.totalResponses + 1) {
    throw new Error("Public CSAT total did not move after ingest");
  }

  await db.user.create({
    data: {
      email,
      role: "cx",
      passwordHash: await hashPassword(password),
    },
  });
  const cookies = await signIn();

  const insightsResponse = await fetch(`${baseUrl}/api/insights`, {
    headers: { cookie: cookies },
  });
  const insights = (await insightsResponse.json()) as Array<{
    responseId: string;
  }>;
  const dashboardHasResponse = insights.some(
    (insight) => insight.responseId === stored.id
  );
  console.log(`Dashboard contains response: ${dashboardHasResponse}`);
  if (insightsResponse.status !== 200 || !dashboardHasResponse) {
    throw new Error("Dashboard API did not return the ingested response");
  }

  const chatResponse = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookies,
    },
    body: JSON.stringify({
      question: "Which client gave the lowest rating and why?",
    }),
  });
  const chat = (await chatResponse.json()) as {
    answer?: string;
    sources?: Array<{ responseId?: string; label?: string }>;
  };
  const respondentLabel =
    stored?.client?.company?.trim() ||
    stored?.client?.name?.trim() ||
    "Unknown respondent";
  console.log(
    `Chat cites respondent: ${chat.answer?.includes(respondentLabel) ?? false}`
  );
  if (
    chatResponse.status !== 200 ||
    !chat.sources?.some((source) => source?.responseId === stored?.id) ||
    !chat.answer?.includes(respondentLabel)
  ) {
    throw new Error("Chatbot did not answer with the ingested response citation");
  }

  console.log("PASS webhook created response, insight, and embedding");
  console.log("PASS public CSAT total moved");
  console.log("PASS dashboard and chatbot used the ingested response");
} finally {
  await db.response.deleteMany({ where: { conversationId } });
  if (createdClientId) {
    await db.client.deleteMany({ where: { id: createdClientId } });
  }
  await db.user.deleteMany({ where: { email } });
  await recomputeAggregates();
  await db.$disconnect();
}
