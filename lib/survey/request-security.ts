import { createHmac, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export type SurveyRateLimitAction =
  | "voice"
  | "typed"
  | "integration-invite"
  | "track"
  | "invite-link"
  | "invite-context"
  | "login-ip"
  | "login-email"
  | "chat"
  | "dashboard-invite"
  | "integration-events"
  | "recipient-token"
  | "testimonial";

const WINDOW_MS = 10 * 60 * 1000;
const INTEGRATION_INVITE_DIGEST = "integration-api";
const LIMITS: Record<SurveyRateLimitAction, number> = {
  voice: 10,
  typed: 20,
  "integration-invite": 100,
  track: 60,
  "invite-link": 20,
  "invite-context": 60,
  "login-ip": 20,
  "login-email": 8,
  chat: 30,
  "dashboard-invite": 1000,
  "integration-events": 600,
  "recipient-token": 30,
  testimonial: 20,
};

/** Public JSON bodies are small; anything larger is rejected before parsing. */
export const MAX_PUBLIC_JSON_BYTES = 64 * 1024;

type PublicPostValidation =
  | { ok: true }
  | { ok: false; status: 403 | 413 | 415; error: string };

function originFromEnvUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

/** Origins configured for this deployment (dashboard and/or public survey). */
export function configuredSurveyOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const value of [
    process.env.NEXTAUTH_URL,
    process.env.SURVEY_PUBLIC_URL,
  ]) {
    const origin = originFromEnvUrl(value);
    if (origin) origins.add(origin);
  }
  return origins;
}

/**
 * Public origin as seen through a reverse proxy (Host + X-Forwarded-*).
 * Falls back to request.nextUrl when forwarded headers are absent.
 */
export function resolveRequestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",", 1)[0]
    ?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  if (host) {
    const forwardedProto = request.headers
      .get("x-forwarded-proto")
      ?.split(",", 1)[0]
      ?.trim();
    const proto =
      forwardedProto ||
      request.nextUrl.protocol.replace(":", "") ||
      "https";
    try {
      return new URL(`${proto}://${host}`).origin;
    } catch {
      // Fall through to nextUrl.
    }
  }
  return request.nextUrl.origin;
}

export function isAllowedSurveyOrigin(
  origin: string,
  request: NextRequest
): boolean {
  if (origin === request.nextUrl.origin) return true;
  if (origin === resolveRequestOrigin(request)) return true;
  return configuredSurveyOrigins().has(origin);
}

export function validatePublicPost(
  request: NextRequest
): PublicPostValidation {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return {
      ok: false,
      status: 415,
      error: "application/json is required",
    };
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PUBLIC_JSON_BYTES) {
    return { ok: false, status: 413, error: "request body too large" };
  }

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || fetchSite === "cross-site" || !isAllowedSurveyOrigin(origin, request)) {
    return {
      ok: false,
      status: 403,
      error: "cross-origin request rejected",
    };
  }

  return { ok: true };
}

/**
 * Client IP as recorded by the nearest trusted proxy. nginx (VPS) and Vercel
 * both set `X-Real-IP` to the connecting address; otherwise the rightmost
 * `X-Forwarded-For` hop is the one our proxy appended. The leftmost hop and
 * the User-Agent are client-controlled and must never key a rate limit.
 */
export function trustedClientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const hops = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  return hops?.length ? hops[hops.length - 1]! : "unknown";
}

export function clientDigest(
  request: NextRequest,
  configuredSecret = process.env.NEXTAUTH_SECRET
) {
  if (!configuredSecret) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }

  return createHmac("sha256", configuredSecret)
    .update(trustedClientIp(request))
    .digest("hex");
}

export function keyDigest(
  value: string,
  configuredSecret = process.env.NEXTAUTH_SECRET
) {
  if (!configuredSecret) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }
  return createHmac("sha256", configuredSecret)
    .update(`key:${value}`)
    .digest("hex");
}

export async function consumeSurveyRateLimit(
  request: NextRequest,
  action: SurveyRateLimitAction,
  now = new Date(),
  configuredSecret = process.env.NEXTAUTH_SECRET
) {
  return consumeRateLimitForDigest(
    clientDigest(request, configuredSecret),
    action,
    now
  );
}

export async function consumeRateLimitForDigest(
  digest: string,
  action: SurveyRateLimitAction,
  now = new Date(),
  cost = 1
) {
  const windowStart = new Date(
    Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS
  );
  const units = Math.max(1, Math.floor(cost));
  const rows = await db.$queryRaw<{ count: number }[]>(Prisma.sql`
    INSERT INTO "SurveyRateLimit"
      ("id", "digest", "action", "windowStart", "count", "updatedAt")
    VALUES
      (${randomUUID()}, ${digest}, ${action}, ${windowStart}, ${units}, NOW())
    ON CONFLICT ("digest", "action", "windowStart")
    DO UPDATE SET
      "count" = "SurveyRateLimit"."count" + ${units},
      "updatedAt" = NOW()
    RETURNING "count"
  `);

  const count = Number(rows[0]?.count ?? 1);
  const limit = LIMITS[action];
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(
      (windowStart.getTime() + WINDOW_MS - now.getTime()) / 1000
    )
  );

  return {
    allowed: count <= limit,
    count,
    limit,
    retryAfterSeconds,
  };
}

export async function consumeIntegrationInviteRateLimit(
  recipientCount: number,
  now = new Date()
) {
  const safeCount = Math.max(1, Math.floor(recipientCount));
  const windowStart = new Date(
    Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS
  );
  const action: SurveyRateLimitAction = "integration-invite";
  const rows = await db.$queryRaw<{ count: number }[]>(Prisma.sql`
    INSERT INTO "SurveyRateLimit"
      ("id", "digest", "action", "windowStart", "count", "updatedAt")
    VALUES
      (${randomUUID()}, ${INTEGRATION_INVITE_DIGEST}, ${action}, ${windowStart}, ${safeCount}, NOW())
    ON CONFLICT ("digest", "action", "windowStart")
    DO UPDATE SET
      "count" = "SurveyRateLimit"."count" + ${safeCount},
      "updatedAt" = NOW()
    RETURNING "count"
  `);

  const count = Number(rows[0]?.count ?? safeCount);
  const limit = LIMITS[action];
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStart.getTime() + WINDOW_MS - now.getTime()) / 1000)
  );

  return {
    allowed: count <= limit,
    count,
    limit,
    retryAfterSeconds,
  };
}
