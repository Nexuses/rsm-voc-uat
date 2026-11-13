import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { digestIp } from "@/lib/rbac/roles";
import { trustedClientIp } from "@/lib/survey/request-security";

/** Cron auth check that records rejected attempts in the audit log. */
export async function authorizeCronRequest(request: NextRequest, job: string) {
  if (isAuthorizedCron(request)) return true;
  await writeAuditLog({
    actorType: "system",
    action: "security.cron_auth_failed",
    metadata: { job, path: request.nextUrl.pathname },
    ipDigest: digestIp(trustedClientIp(request)),
    source: "cron",
  });
  return false;
}

export function safeSecretEqual(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Cron routes accept only `Authorization: Bearer <CRON_SECRET>`. Query-string
 * secrets are rejected because they leak into proxy and access logs.
 */
export function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  return safeSecretEqual(authHeader.slice("Bearer ".length).trim(), secret);
}
