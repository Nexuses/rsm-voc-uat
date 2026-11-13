import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const STALE_LOCK_MINUTES = 10;

export type ClaimedJob = {
  id: string;
  type: string;
  jobKey: string;
  payload: Prisma.JsonValue;
  attempts: number;
  maxAttempts: number;
  correlationId: string | null;
};

export async function enqueueJob(input: {
  type: string;
  jobKey: string;
  payload: Prisma.InputJsonValue;
  runAt?: Date;
  maxAttempts?: number;
  correlationId?: string | null;
}) {
  await db.job.createMany({
    data: [
      {
        id: randomUUID(),
        type: input.type,
        jobKey: input.jobKey,
        payload: input.payload,
        runAt: input.runAt ?? new Date(),
        maxAttempts: input.maxAttempts ?? 5,
        correlationId: input.correlationId ?? null,
      },
    ],
    skipDuplicates: true,
  });
}

/**
 * Claims due jobs, plus jobs whose worker died mid-run (stale lock). Safe to
 * call from several processes at once.
 */
export async function claimJobs(workerId: string, limit: number) {
  return db.$queryRaw<ClaimedJob[]>(Prisma.sql`
    UPDATE "Job"
    SET "status" = 'running',
        "lockedAt" = NOW(),
        "lockedBy" = ${workerId},
        "attempts" = "attempts" + 1,
        "updatedAt" = NOW()
    WHERE "id" IN (
      SELECT "id" FROM "Job"
      WHERE ("status" = 'queued' AND "runAt" <= NOW())
         OR ("status" = 'running'
             AND "lockedAt" < NOW() - make_interval(mins => ${STALE_LOCK_MINUTES}))
      ORDER BY "runAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "type", "jobKey", "payload", "attempts", "maxAttempts", "correlationId"
  `);
}

export async function completeJob(id: string) {
  await db.job.update({
    where: { id },
    data: {
      status: "succeeded",
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
    },
  });
}

export function retryDelayMs(attempts: number) {
  return Math.min(60 * 60 * 1000, 30_000 * 2 ** Math.max(0, attempts - 1));
}

export async function failJob(job: ClaimedJob, error: unknown, now = new Date()) {
  const message =
    error instanceof Error ? error.message : String(error ?? "unknown error");
  const dead = job.attempts >= job.maxAttempts;
  await db.job.update({
    where: { id: job.id },
    data: {
      status: dead ? "dead" : "queued",
      runAt: dead ? undefined : new Date(now.getTime() + retryDelayMs(job.attempts)),
      lockedAt: null,
      lockedBy: null,
      lastError: message.slice(0, 2000),
    },
  });
  return { dead };
}
