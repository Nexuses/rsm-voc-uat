import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { startLoginOtp } from "@/lib/login-otp";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import { digestIp } from "@/lib/rbac/roles";
import {
  consumeRateLimitForDigest,
  consumeSurveyRateLimit,
  keyDigest,
  trustedClientIp,
} from "@/lib/survey/request-security";

const schema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const ipLimit = await consumeSurveyRateLimit(request, "login-ip");
    const emailLimit = await consumeRateLimitForDigest(
      keyDigest(parsed.data.email),
      "login-email"
    );
    if (!ipLimit.allowed || !emailLimit.allowed) {
      await writeAuditLog({
        actorType: "system",
        action: "auth.login_throttled",
        metadata: {
          email: parsed.data.email,
          scope: !ipLimit.allowed ? "ip" : "email",
        },
        ipDigest: digestIp(trustedClientIp(request)),
        source: "api",
      });
      const retryAfter = Math.max(
        ipLimit.allowed ? 0 : ipLimit.retryAfterSeconds,
        emailLimit.allowed ? 0 : emailLimit.retryAfterSeconds
      );
      return NextResponse.json(
        { error: "Too many sign-in attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const result = await startLoginOtp({
      ...parsed.data,
      ipDigest: digestIp(trustedClientIp(request)),
    });
    if (!result.ok) {
      if (result.reason === "email_failed") {
        return NextResponse.json(
          { error: "Unable to send verification email. Try again shortly." },
          { status: 503 }
        );
      }
      // Same message for invalid credentials to avoid account enumeration.
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "A verification code was sent to your email.",
    });
  } catch (error) {
    if (isTransientPrismaError(error)) {
      return databaseUnavailableResponse();
    }
    throw error;
  }
}
