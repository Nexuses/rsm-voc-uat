import { NextRequest, NextResponse } from "next/server";
import {
  isCxAuthError,
  isCxPermissionError,
  requirePermission,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import {
  getSurveyReminderSettings,
  updateSurveyReminderSettings,
} from "@/lib/survey-reminder-config";

export async function GET() {
  try {
    await requirePermission("invite.tracker");
    const settings = await getSurveyReminderSettings();
    return NextResponse.json({ settings });
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
    console.error("get reminder settings failed", error);
    return NextResponse.json({ error: "Failed to load reminder settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requirePermission("users.manage");
    const body = (await request.json().catch(() => ({}))) as {
      intervalDays?: number;
      maxCount?: number;
      ccEmails?: string;
      maxAutoSendsPerRun?: number;
    };

    const settings = await updateSurveyReminderSettings({
      intervalDays: Number(body.intervalDays),
      maxCount: Number(body.maxCount),
      ccEmails: typeof body.ccEmails === "string" ? body.ccEmails : "",
      maxAutoSendsPerRun: Number(body.maxAutoSendsPerRun),
      updatedByUserId: session.user.id,
    });

    await writeAuditLog({
      actorType: "user",
      actorUserId: session.user.id,
      action: "settings.reminders_updated",
      resourceType: "SurveyReminderConfig",
      resourceId: "default",
      metadata: {
        intervalDays: settings.intervalDays,
        maxCount: settings.maxCount,
        maxAutoSendsPerRun: settings.maxAutoSendsPerRun,
        ccCount: settings.ccEmails.length,
      },
      source: "api",
    });

    return NextResponse.json({ settings });
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
    console.error("update reminder settings failed", error);
    return NextResponse.json(
      { error: "Failed to update reminder settings" },
      { status: 500 }
    );
  }
}
