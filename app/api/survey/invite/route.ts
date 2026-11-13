import { NextRequest, NextResponse } from "next/server";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import {
  dashboardInviteBodySchema,
  hasConflictingInviteRecipients,
  MAX_INVITE_RECIPIENTS_PER_REQUEST,
  resolveInviteRecipients,
  sendSurveyInvites,
} from "@/lib/survey-invite-request";
import { isSmtpConfigured } from "@/lib/survey-invite-email";
import {
  consumeRateLimitForDigest,
  keyDigest,
} from "@/lib/survey/request-security";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("invite.send");

    if (!isSmtpConfigured()) {
      return NextResponse.json(
        { error: "Email sending is not configured on this server." },
        { status: 503 }
      );
    }

    const payload = await request.json();
    const parsed = dashboardInviteBodySchema.safeParse(payload);
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
          error: `Send at most ${MAX_INVITE_RECIPIENTS_PER_REQUEST} recipients per upload.`,
        },
        { status: 413 }
      );
    }

    const inviteLimit = await consumeRateLimitForDigest(
      keyDigest(`dashboard-invite:${session.user.id}`),
      "dashboard-invite",
      new Date(),
      recipients.length
    );
    if (!inviteLimit.allowed) {
      return NextResponse.json(
        { error: "Invite sending limit reached. Try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(inviteLimit.retryAfterSeconds) },
        }
      );
    }

    const result = await sendSurveyInvites({
      recipients,
      subject: parsed.data.subject,
      actorUserId: session.user.id,
      actorType: "user",
    });

    if (result.total === 1) {
      return NextResponse.json({
        ok: result.ok,
        sent: result.sent,
        failed: result.failed,
        total: result.total,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (isCxAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isCxPermissionError(error)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("survey invite send failed", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
