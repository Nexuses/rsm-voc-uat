import crypto from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const email = "step9-cx@example.test";
const password = crypto.randomBytes(24).toString("base64url");
const otp = "424242";
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

function hashLoginOtp(code) {
  const secret = process.env.NEXTAUTH_SECRET ?? "voc-otp";
  return crypto.createHash("sha256").update(`${secret}:${code}`).digest("hex");
}

try {
  const anonymousResponse = await fetch(`${baseUrl}/api/insights`, {
    redirect: "manual",
  });
  console.log(`Anonymous /api/insights: ${anonymousResponse.status}`);
  if (anonymousResponse.status !== 401) {
    throw new Error(`Expected anonymous status 401, received ${anonymousResponse.status}`);
  }

  const user = await db.user.upsert({
    where: { email },
    update: {
      role: "cx",
      passwordHash: await hashPassword(password),
    },
    create: {
      email,
      role: "cx",
      passwordHash: await hashPassword(password),
    },
  });

  await db.loginOtp.deleteMany({ where: { userId: user.id } });
  await db.loginOtp.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      codeHash: hashLoginOtp(otp),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  let cookieHeader = cookiesFrom(csrfResponse);
  const { csrfToken } = await csrfResponse.json();

  const signInResponse = await fetch(
    `${baseUrl}/api/auth/callback/credentials?json=true`,
    {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: cookieHeader,
      },
      body: new URLSearchParams({
        csrfToken,
        email,
        password,
        otp,
        callbackUrl: `${baseUrl}/dashboard`,
        json: "true",
      }),
    }
  );
  cookieHeader = mergeCookies(cookieHeader, cookiesFrom(signInResponse));
  console.log(`Credentials callback: ${signInResponse.status}`);
  if (![200, 302].includes(signInResponse.status)) {
    throw new Error(`Credentials sign-in failed with ${signInResponse.status}`);
  }

  const authenticatedResponse = await fetch(`${baseUrl}/api/insights`, {
    headers: { cookie: cookieHeader },
    redirect: "manual",
  });
  console.log(`Authenticated /api/insights: ${authenticatedResponse.status}`);
  if (authenticatedResponse.status !== 200) {
    throw new Error(
      `Expected authenticated status 200, received ${authenticatedResponse.status}`
    );
  }

  const dashboardResponse = await fetch(`${baseUrl}/dashboard`, {
    headers: { cookie: cookieHeader },
    redirect: "manual",
  });
  console.log(`Authenticated /dashboard: ${dashboardResponse.status}`);
  if (dashboardResponse.status !== 200) {
    throw new Error(`Expected dashboard status 200, received ${dashboardResponse.status}`);
  }

  console.log("PASS anonymous API request blocked");
  console.log("PASS credentials + OTP session accepted");
  console.log("PASS authenticated API and dashboard allowed");
} finally {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    await db.loginOtp.deleteMany({ where: { userId: user.id } });
  }
  await db.user.deleteMany({ where: { email } });
  await db.$disconnect();
}
