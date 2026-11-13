import { enqueueJob } from "@/lib/jobs/queue";

const SLA_MONITOR_WINDOW_MS = 15 * 60 * 1000;

/** Enqueues recurring maintenance jobs; jobKey per window keeps it to one run. */
export async function enqueueRecurringJobs(now = new Date()) {
  const window = Math.floor(now.getTime() / SLA_MONITOR_WINDOW_MS);
  await enqueueJob({
    type: "cases.sla_monitor",
    jobKey: `cases.sla_monitor:${window}`,
    payload: { window },
    maxAttempts: 2,
  });

  const day = now.toISOString().slice(0, 10);
  for (const type of ["accounts.health_refresh", "training.evaluate", "benchmarks.refresh"]) {
    await enqueueJob({
      type,
      jobKey: `${type}:${day}`,
      payload: { day },
      maxAttempts: 2,
    });
  }
}
