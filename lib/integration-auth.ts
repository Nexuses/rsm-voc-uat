import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { verifyInboundApiKey } from "@/lib/integrations/api-keys";

export class IntegrationAuthError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "IntegrationAuthError";
  }
}

function configuredSurveyInviteApiKey() {
  return process.env.SURVEY_INVITE_API_KEY?.trim() ?? "";
}

function bearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
}

function keysMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function isSurveyInviteApiAuthorized(request: NextRequest): boolean {
  const expected = configuredSurveyInviteApiKey();
  if (!expected) return false;

  const token = bearerToken(request);
  if (!token) return false;

  return keysMatch(token, expected);
}

export function requireSurveyInviteApiKey(request: NextRequest): void {
  if (!isSurveyInviteApiAuthorized(request)) {
    throw new IntegrationAuthError();
  }
}

/** Legacy SURVEY_INVITE_API_KEY, or a scoped key created in Integrations. */
export async function requireSurveyInviteApiKeyOrScopedKey(request: NextRequest) {
  if (isSurveyInviteApiAuthorized(request)) return;
  const token = bearerToken(request);
  if (token && (await verifyInboundApiKey(token, "survey_invites.send"))) return;
  throw new IntegrationAuthError();
}

export function isIntegrationAuthError(
  error: unknown
): error is IntegrationAuthError {
  return error instanceof IntegrationAuthError;
}
