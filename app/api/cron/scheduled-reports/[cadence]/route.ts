import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { authorizeCronRequest } from "@/lib/cron-auth";
import {
  isScheduledReportCadence,
  processScheduledCxReport,
} from "@/lib/scheduled-cx-report";
import { isSmtpConfigured } from "@/lib/survey-invite-email";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cadence: string }> }
) {
  if (!(await authorizeCronRequest(request, "scheduled-reports"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { error: "Email sending is not configured on this server." },
      { status: 503 }
    );
  }

  const { cadence } = await context.params;
  if (!isScheduledReportCadence(cadence)) {
    return NextResponse.json({ error: "Invalid cadence" }, { status: 400 });
  }

  try {
    const result = await processScheduledCxReport(cadence);
    // The report emails a PII export, so every send is audited.
    await writeAuditLog({
      actorType: "system",
      action: "report.scheduled_sent",
      metadata: { ...result, cadence },
      source: "cron",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("scheduled CX report cron failed", error);
    return NextResponse.json(
      { error: "Failed to send scheduled CX report" },
      { status: 500 }
    );
  }
}
