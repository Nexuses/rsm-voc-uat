import { randomUUID } from "node:crypto";
import { JOB_HANDLERS } from "@/lib/jobs/handlers";
import { claimJobs, completeJob, failJob, type ClaimedJob } from "@/lib/jobs/queue";
import { log } from "@/lib/observability/log";

export type RunDueJobsResult = {
  claimed: number;
  succeeded: number;
  retried: number;
  dead: number;
};

async function runOne(job: ClaimedJob) {
  const handler = JOB_HANDLERS[job.type];
  if (!handler) throw new Error(`No handler registered for job type ${job.type}`);
  if (job.attempts > job.maxAttempts) {
    throw new Error(`Job exceeded ${job.maxAttempts} attempts`);
  }
  await handler(job);
}

/**
 * Drains due jobs until the batch limit or time budget runs out. Called by the
 * cron tick and by the long-running worker.
 */
export async function runDueJobs(options?: {
  workerId?: string;
  batchSize?: number;
  budgetMs?: number;
}): Promise<RunDueJobsResult> {
  const workerId = options?.workerId ?? `tick-${randomUUID()}`;
  const batchSize = options?.batchSize ?? 20;
  const deadline = Date.now() + (options?.budgetMs ?? 45_000);
  const result: RunDueJobsResult = { claimed: 0, succeeded: 0, retried: 0, dead: 0 };

  while (Date.now() < deadline) {
    const jobs = await claimJobs(workerId, batchSize);
    if (!jobs.length) break;
    result.claimed += jobs.length;

    for (const job of jobs) {
      const startedAt = Date.now();
      try {
        await runOne(job);
        await completeJob(job.id);
        result.succeeded += 1;
        log("info", "job succeeded", {
          jobId: job.id,
          type: job.type,
          correlationId: job.correlationId,
          latencyMs: Date.now() - startedAt,
        });
      } catch (error) {
        log("error", "job failed", {
          jobId: job.id,
          type: job.type,
          attempt: job.attempts,
          correlationId: job.correlationId,
          error,
        });
        const { dead } = await failJob(job, error);
        if (dead) result.dead += 1;
        else result.retried += 1;
      }
    }
    if (jobs.length < batchSize) break;
  }
  return result;
}
