import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { runDueJobs } from "@/lib/jobs/runner";
import { enqueueRecurringJobs } from "@/lib/jobs/schedule";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!(await authorizeCronRequest(request, "jobs"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await enqueueRecurringJobs();
    const result = await runDueJobs({ budgetMs: 45_000 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("job tick failed", error);
    return NextResponse.json({ error: "Failed to run jobs" }, { status: 500 });
  }
}
