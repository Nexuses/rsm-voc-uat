import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { sendSurveyInviteEmail } from "@/lib/survey-invite-email";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LENGTH = 6;

const DUMMY_PASSWORD_HASH =
  "scrypt$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export function hashLoginOtp(code: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not configured");
  return createHash("sha256").update(`${secret}:${code}`).digest("hex");
}

function otpHashesMatch(stored: string, candidate: string) {
  const a = Buffer.from(stored);
  const b = Buffer.from(candidate);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function generateLoginOtpCode() {
  const max = 10 ** OTP_LENGTH;
  return String(randomInt(0, max)).padStart(OTP_LENGTH, "0");
}

export async function startLoginOtp(input: {
  email: string;
  password: string;
  ipDigest?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, disabledAt: true },
  });

  const passwordOk = await verifyPassword(
    input.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH
  );

  if (!user || !passwordOk || user.disabledAt) {
    await writeAuditLog({
      actorType: "system",
      action: "auth.login_failed",
      metadata: { email, stage: "password" },
      ipDigest: input.ipDigest ?? null,
      source: "api",
    });
    return { ok: false as const, reason: "invalid_credentials" as const };
  }

  const code = generateLoginOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.loginOtp.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await db.loginOtp.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      codeHash: hashLoginOtp(code),
      expiresAt,
    },
  });

  const html = loadLoginOtpTemplate().replaceAll("{{otp_code}}", code);
  const text = [
    "RSM in Kuwait — Voice of Clients",
    "",
    "Your sign-in verification code:",
    code,
    "",
    "This code expires in 10 minutes. If you did not try to sign in, ignore this email.",
    "",
    "Best regards,",
    "RSM in Kuwait",
  ].join("\n");

  try {
    await sendSurveyInviteEmail({
      to: user.email,
      subject: "RSM in Kuwait — Voice of Clients sign-in code",
      text,
      html,
    });
  } catch (error) {
    console.error("login OTP email failed:", error);
    if (process.env.NODE_ENV === "production") {
      return { ok: false as const, reason: "email_failed" as const };
    }
  }

  // `next dev` only: print the code so local logins work without inbox access.
  if (process.env.NODE_ENV === "development") {
    console.info(`[login-otp] code for ${user.email}: ${code}`);
  }

  await writeAuditLog({
    actorType: "system",
    action: "auth.otp_issued",
    resourceType: "User",
    resourceId: user.id,
    ipDigest: input.ipDigest ?? null,
    source: "api",
  });

  return { ok: true as const, email: user.email };
}

export async function consumeLoginOtp(input: {
  userId: string;
  code: string;
}) {
  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false as const, reason: "invalid_code" as const };
  }

  const otp = await db.loginOtp.findFirst({
    where: {
      userId: input.userId,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    await writeAuditLog({
      actorType: "system",
      action: "auth.mfa_failed",
      metadata: { userId: input.userId, reason: "no_active_otp" },
    });
    return { ok: false as const, reason: "expired_or_missing" as const };
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await db.loginOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
    await writeAuditLog({
      actorType: "system",
      action: "auth.mfa_failed",
      metadata: { userId: input.userId, reason: "too_many_attempts" },
    });
    return { ok: false as const, reason: "too_many_attempts" as const };
  }

  const matches = otpHashesMatch(otp.codeHash, hashLoginOtp(code));
  if (!matches) {
    await db.loginOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    await writeAuditLog({
      actorType: "system",
      action: "auth.mfa_failed",
      metadata: { userId: input.userId, reason: "bad_code" },
    });
    return { ok: false as const, reason: "invalid_code" as const };
  }

  await db.loginOtp.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  await writeAuditLog({
    actorType: "user",
    actorUserId: input.userId,
    action: "auth.mfa_success",
    resourceType: "User",
    resourceId: input.userId,
  });

  return { ok: true as const };
}

function loadLoginOtpTemplate() {
  try {
    return readFileSync(
      join(process.cwd(), "templates/email/voc-login-otp.html"),
      "utf8"
    );
  } catch {
    return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center" style="padding:24px 12px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
<tr><td style="padding:25px 30px;color:#333333;font-size:14px;line-height:20px;">
<p style="margin:0 0 12px 0;font-size:18px;font-weight:bold;color:#00153D;">Your Voice of Clients verification code</p>
<p style="margin:0 0 16px 0;">Use this one-time code to finish signing in to the RSM in Kuwait CX dashboard.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e6e6e6;"><tr><td style="padding:20px;text-align:center;">
<p style="margin:0;font-size:32px;font-weight:bold;letter-spacing:0.28em;color:#00153D;">{{otp_code}}</p>
</td></tr></table>
<p style="margin:18px 0 12px 0;">This code expires in 10 minutes. If you did not try to sign in, you can ignore this email.</p>
<p style="margin:0 0 4px 0;">Best regards,</p>
<p style="margin:0;font-weight:bold;">RSM in Kuwait</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
  }
}
