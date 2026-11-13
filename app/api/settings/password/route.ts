import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isCxAuthError,
  isCxPermissionError,
  requireAnyPermission,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import { SETTINGS_GATE_PERMISSIONS } from "@/lib/rbac/settings-tabs";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(8).max(200),
    confirmPassword: z.string().min(8).max(200),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "New password must be different",
    path: ["newPassword"],
  });

export async function POST(request: NextRequest) {
  try {
    const session = await requireAnyPermission(SETTINGS_GATE_PERMISSIONS);

    const parsed = changePasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      const mismatch = parsed.error.issues.some(
        (issue) => issue.path[0] === "confirmPassword"
      );
      const sameAsCurrent = parsed.error.issues.some(
        (issue) =>
          issue.path[0] === "newPassword" &&
          issue.message === "New password must be different"
      );
      return NextResponse.json(
        {
          error: mismatch
            ? "New password and confirmation do not match."
            : sameAsCurrent
              ? "Choose a password different from your current one."
              : "Password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOk = await verifyPassword(
      parsed.data.currentPassword,
      user.passwordHash
    );
    if (!currentOk) {
      await writeAuditLog({
        actorType: "user",
        actorUserId: user.id,
        action: "user.password_change_failed",
        resourceType: "User",
        resourceId: user.id,
        metadata: { reason: "bad_current_password" },
      });
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });

    // Drop unused MFA codes so a leaked inbox OTP cannot pair with the old password flow.
    await db.loginOtp.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    await writeAuditLog({
      actorType: "user",
      actorUserId: user.id,
      action: "user.password_changed",
      resourceType: "User",
      resourceId: user.id,
      metadata: { email: user.email },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isCxAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isCxPermissionError(error)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isTransientPrismaError(error)) {
      return databaseUnavailableResponse();
    }
    throw error;
  }
}
