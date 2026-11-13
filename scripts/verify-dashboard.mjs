import crypto from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const email = "step10-cx@example.test";
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

async function getInsights(cookies, query = "") {
  const response = await fetch(`${baseUrl}/api/insights${query}`, {
    headers: { cookie: cookies },
  });
  if (response.status !== 200) {
    throw new Error(`Insights request failed with ${response.status}`);
  }
  return response.json();
}

try {
  await db.user.create({
    data: {
      email,
      role: "cx",
      passwordHash: await hashPassword(password),
    },
  });

  for (const fixture of [
    {
      suffix: "positive",
      company: "Dashboard Positive Company",
      rating: 5,
      sentiment: "positive",
      riskSignals: [],
    },
    {
      suffix: "negative",
      company: "Dashboard Negative Company",
      rating: 1,
      sentiment: "negative",
      riskSignals: ["churn risk"],
    },
  ]) {
    await db.response.create({
      data: {
        conversationId: `dashboard-${runId}-${fixture.suffix}`,
        language: "en",
        surveyVersion: "three-metric-v2",
        avgRating: fixture.rating,
        csatScore: fixture.rating,
        cesScore: fixture.rating === 5 ? 7 : 2,
        npsScore: fixture.rating === 5 ? 10 : 2,
        answers: [
          {
            question_number: 1,
            metric: "csat",
            scale_min: 1,
            scale_max: 5,
            rating: fixture.rating,
            reason_text: `${fixture.sentiment} dashboard fixture`,
          },
          {
            question_number: 2,
            metric: "ces",
            scale_min: 1,
            scale_max: 7,
            rating: fixture.rating === 5 ? 7 : 2,
          },
          {
            question_number: 3,
            metric: "nps",
            scale_min: 0,
            scale_max: 10,
            rating: fixture.rating === 5 ? 10 : 2,
          },
        ],
        rawPayload: { fixture: "dashboard", runId },
        client: {
          create: {
            name: `${fixture.sentiment} contact`,
            company: fixture.company,
            designation: "Verification Manager",
            locale: "en",
          },
        },
        insight: {
          create: {
            overallSentiment: fixture.sentiment,
            satisfactionSummary: `${fixture.sentiment} dashboard summary`,
            keyDrivers: [`${fixture.sentiment} driver`],
            riskSignals: fixture.riskSignals,
            suggestedReply: { en: "Reply" },
            nextSteps: ["Follow up"],
            modelVersion: "dashboard-fixture",
          },
        },
      },
    });
  }

  const cookies = await signIn();
  const all = await getInsights(cookies);
  const negative = await getInsights(cookies, "?sentiment=negative");
  const positive = await getInsights(cookies, "?sentiment=positive");
  const risk = await getInsights(cookies, "?risk=true");

  const fixtureItems = all.filter((item) =>
    item.responseId && item.summary?.includes("dashboard summary")
  );
  console.log(`All fixture insights: ${fixtureItems.length}`);
  console.log(
    `Negative fixture insights: ${negative.filter((item) => item.summary?.startsWith("negative dashboard")).length}`
  );
  console.log(
    `Positive fixture insights: ${positive.filter((item) => item.summary?.startsWith("positive dashboard")).length}`
  );
  console.log(
    `Risk fixture insights: ${risk.filter((item) => item.summary?.startsWith("negative dashboard")).length}`
  );

  if (fixtureItems.length !== 2) {
    throw new Error("Expected both dashboard fixtures in the full list");
  }
  if (
    negative.some((item) => item.summary?.startsWith("positive dashboard")) ||
    positive.some((item) => item.summary?.startsWith("negative dashboard"))
  ) {
    throw new Error("Sentiment filter returned the wrong fixture");
  }
  if (
    !risk.some((item) => item.summary?.startsWith("negative dashboard")) ||
    risk.some((item) => item.summary?.startsWith("positive dashboard"))
  ) {
    throw new Error("Risk filter returned the wrong fixture");
  }

  console.log("PASS dashboard API lists insights");
  console.log("PASS sentiment and risk filters work");
} finally {
  await db.response.deleteMany({
    where: { conversationId: { startsWith: `dashboard-${runId}-` } },
  });
  await db.client.deleteMany({
    where: {
      company: {
        in: ["Dashboard Positive Company", "Dashboard Negative Company"],
      },
    },
  });
  await db.user.deleteMany({ where: { email } });
  await db.$disconnect();
}
