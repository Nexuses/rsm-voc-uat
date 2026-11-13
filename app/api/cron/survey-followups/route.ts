import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { getFlagMode } from "@/lib/flags";
import { enqueueJob } from "@/lib/jobs/queue";
import { isKuwaitReminderWeekday } from "@/lib/survey-followup-cadence";
import { isSmtpConfigured } from "@/lib/survey-invite-email";
import { processDueSurveyFollowups } from "@/lib/survey-invite-tracking";

export async function GET(request: NextRequest) {
  if (!(await authorizeCronRequest(request, "survey-followups"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { error: "Email sending is not configured on this server." },
      { status: 503 }
    );
  }

  try {
    // Defense in depth: Kuwait Fri–Sat are non-send days even if crontab is wrong.
    if (!isKuwaitReminderWeekday(new Date())) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "kuwait_weekend",
        sent: 0,
        checked: 0,
      });
    }

    if ((await getFlagMode("jobs.background_work")) === "live") {
      const day = new Date().toISOString().slice(0, 10);
      await enqueueJob({
        type: "invites.followups",
        jobKey: `invites.followups:${day}`,
        payload: { day },
      });
      return NextResponse.json({ ok: true, queued: true });
    }
    const result = await processDueSurveyFollowups();
    await writeAuditLog({
      actorType: "system",
      action: "cron.survey_followups",
      metadata: result,
      source: "cron",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("survey follow-up cron failed", error);
    return NextResponse.json(
      { error: "Failed to process survey follow-ups" },
      { status: 500 }
    );
  }
}
