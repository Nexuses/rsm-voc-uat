import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { jobQueueStats } from "@/lib/jobs/stats";

export const runtime = "nodejs";

/** Operational health for monitors. Bearer CRON_SECRET; never public. */
export async function GET(request: NextRequest) {
  if (!(await authorizeCronRequest(request, "health"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const jobs = await jobQueueStats();
    return NextResponse.json({ ok: true, jobs });
  } catch (error) {
    console.error("health check failed", error);
    return NextResponse.json({ ok: false, error: "database unavailable" }, { status: 503 });
  }
}
