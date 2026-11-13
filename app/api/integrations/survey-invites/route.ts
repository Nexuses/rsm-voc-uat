import { NextRequest, NextResponse } from "next/server";
import {
  isIntegrationAuthError,
  requireSurveyInviteApiKeyOrScopedKey,
} from "@/lib/integration-auth";
import {
  hasConflictingInviteRecipients,
  integrationInviteBodySchema,
  MAX_INVITE_RECIPIENTS_PER_REQUEST,
  resolveInviteRecipients,
  resolveInviteSubject,
  sendSurveyInvites,
} from "@/lib/survey-invite-request";
import { isSmtpConfigured } from "@/lib/survey-invite-email";
import {
  consumeIntegrationInviteRateLimit,
  trustedClientIp,
} from "@/lib/survey/request-security";
import { writeAuditLog } from "@/lib/audit";
import { digestIp } from "@/lib/rbac/roles";

function requiresJsonContentType(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.toLowerCase().startsWith("application/json");
}

export async function POST(request: NextRequest) {
  try {
    await requireSurveyInviteApiKeyOrScopedKey(request);

    if (!requiresJsonContentType(request)) {
      return NextResponse.json(
        { error: "application/json is required" },
        { status: 415 }
      );
    }

    if (!isSmtpConfigured()) {
      return NextResponse.json(
        { error: "Email sending is not configured on this server." },
        { status: 503 }
      );
    }

    const payload = await request.json();
    const parsed = integrationInviteBodySchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid invite payload" }, { status: 400 });
    }

    if (hasConflictingInviteRecipients(parsed.data)) {
      return NextResponse.json(
        { error: "Use either a single recipient or a CSV upload, not both." },
        { status: 400 }
      );
    }

    const recipients = resolveInviteRecipients(parsed.data);
    if (!recipients.length) {
      return NextResponse.json(
        { error: "Provide at least one valid recipient email." },
        { status: 400 }
      );
    }
    if (recipients.length > MAX_INVITE_RECIPIENTS_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `Send at most ${MAX_INVITE_RECIPIENTS_PER_REQUEST} recipients per request.`,
        },
        { status: 413 }
      );
    }

    const rateLimit = await consumeIntegrationInviteRateLimit(recipients.length);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const result = await sendSurveyInvites({
      recipients,
      subject: resolveInviteSubject(parsed.data),
      actorType: "integration",
    });

    return NextResponse.json(result);
  } catch (error) {
    if (isIntegrationAuthError(error)) {
      await writeAuditLog({
        actorType: "integration",
        action: "security.integration_auth_failed",
        metadata: { path: request.nextUrl.pathname },
        ipDigest: digestIp(trustedClientIp(request)),
        source: "api",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("integration survey invite send failed", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
