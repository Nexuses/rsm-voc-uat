import crypto from "node:crypto";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const { db } = await import("../lib/db");
const { hashPassword } = await import("../lib/password");
const { recomputeAggregates } = await import("../lib/aggregate");

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (!nextAuthSecret) {
  throw new Error("NEXTAUTH_SECRET is required");
}

const submissionId = crypto.randomUUID();
const conversationId = `typed_${submissionId}`;
const email = `survey-${submissionId}@example.test`;
const password = crypto.randomBytes(24).toString("base64url");
const testAddress = "198.51.100.42";
const testUserAgent = `survey-e2e-${submissionId}`;
const fullName = "Typed Verifier";
const company = `Verification Company ${submissionId}`;
const designation = "Finance Director";
const csatComment = `CSAT verification comment ${submissionId}`;
const cesComment = `CES verification comment ${submissionId}`;
const npsComment = `NPS verification comment ${submissionId}`;
const startedAt = new Date();
let createdClientId: string | null = null;

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
  return [...cookies]
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

async function signIn() {
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  let cookies = cookiesFrom(csrfResponse);
  const { csrfToken } = (await csrfResponse.json()) as {
    csrfToken: string;
  };
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

async function submit() {
  return fetch(`${baseUrl}/api/survey/typed`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: new URL(baseUrl).origin,
      "sec-fetch-site": "same-origin",
      "user-agent": testUserAgent,
      "x-forwarded-for": testAddress,
    },
    body: JSON.stringify({
      submissionId,
      fullName,
      company,
      designation,
      csatRating: 5,
      csatComment,
      cesRating: 6,
      cesComment,
      npsRating: 9,
      npsComment,
      website: "",
    }),
  });
}

try {
  const first = await submit();
  const second = await submit();
  console.log(`Typed submit: ${first.status}, retry: ${second.status}`);
  if (first.status !== 200 || second.status !== 200) {
    throw new Error("Typed submission or retry failed");
  }

  // The survey routes store the response and return, then enrich (GPT insight,
  // embedding, notifications, aggregates) in the background. So the row is
  // there immediately but its insight and embedding land a few seconds later —
  // poll rather than asserting on the first read.
  const enrichmentTimeoutMs = Number(
    process.env.VERIFY_ENRICHMENT_TIMEOUT_MS ?? 90_000
  );
  const deadline = Date.now() + enrichmentTimeoutMs;
  let responses = [] as Awaited<ReturnType<typeof findResponses>>;

  async function findResponses() {
    return db.response.findMany({
      where: { conversationId },
      include: {
        client: true,
        insight: true,
        embedding: { select: { id: true } },
      },
    });
  }

  for (;;) {
    responses = await findResponses();
    const enriched =
      responses.length === 1 && responses[0].insight && responses[0].embedding;
    if (enriched || Date.now() > deadline) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(`Stored rows: ${responses.length}`);
  if (responses.length !== 1) {
    throw new Error(`Expected one stored response, found ${responses.length}`);
  }

  const stored = responses[0];
  createdClientId = stored.clientId;
  if (
    stored.client?.name !== fullName ||
    stored.client.company !== company ||
    stored.client.designation !== designation ||
    stored.surveyVersion !== "three-metric-v2" ||
    stored.avgRating !== 5 ||
    stored.csatScore !== 5 ||
    stored.cesScore !== 6 ||
    stored.npsScore !== 9 ||
    !Array.isArray(stored.answers) ||
    stored.answers.length !== 3 ||
    !stored.insight ||
    !stored.embedding
  ) {
    throw new Error("Stored typed response is incomplete");
  }

  const dimensions = await db.$queryRaw<Array<{ dimensions: number }>>`
    SELECT vector_dims(embedding)::int AS dimensions
    FROM "ResponseEmbedding"
    WHERE "responseId" = ${stored.id}
  `;
  console.log(`Embedding dimensions: ${dimensions[0]?.dimensions ?? 0}`);
  if (dimensions[0]?.dimensions !== 1536) {
    throw new Error("Typed response embedding is not 1536-dimensional");
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
  if (
    insightsResponse.status !== 200 ||
    !insights.some((item) => item.responseId === stored.id)
  ) {
    throw new Error("Typed response is missing from the CX insights API");
  }

  const publicResponse = await fetch(
    `${baseUrl}/api/public/metrics?verify=${submissionId}`
  );
  const publicText = await publicResponse.text();
  const lowerPublicText = publicText.toLowerCase();
  if (
    publicResponse.status !== 200 ||
    lowerPublicText.includes(company.toLowerCase()) ||
    lowerPublicText.includes(designation.toLowerCase()) ||
    lowerPublicText.includes(csatComment.toLowerCase()) ||
    lowerPublicText.includes(cesComment.toLowerCase()) ||
    lowerPublicText.includes(npsComment.toLowerCase()) ||
    lowerPublicText.includes(fullName.toLowerCase())
  ) {
    throw new Error("Public metrics response leaked typed survey PII");
  }

  console.log("PASS typed retry remained one response");
  console.log("PASS identity, three metrics, insight, and embedding stored");
  console.log("PASS response visible to authenticated CX API");
  console.log("PASS public metrics response contains no submitted PII");
} finally {
  await db.response.deleteMany({ where: { conversationId } });
  if (createdClientId) {
    await db.client.deleteMany({ where: { id: createdClientId } });
  }
  await db.user.deleteMany({ where: { email } });

  const digest = crypto
    .createHmac("sha256", nextAuthSecret)
    .update(`${testAddress}\n${testUserAgent}`)
    .digest("hex");
  await db.surveyRateLimit.deleteMany({
    where: { digest, updatedAt: { gte: startedAt } },
  });
  await recomputeAggregates();
  await db.$disconnect();
}
