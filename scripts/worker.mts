/**
 * Long-running job worker (PM2 app `rsm-voc-worker`). Drains the Job table in
 * a loop; the /api/cron/jobs tick does the same in bounded batches, and both
 * can run at once because claims use FOR UPDATE SKIP LOCKED.
 *
 *   npx tsx scripts/worker.mts
 */
import { hostname } from "node:os";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const { db } = await import("../lib/db");
const { runDueJobs } = await import("../lib/jobs/runner");
const { enqueueRecurringJobs } = await import("../lib/jobs/schedule");

const workerId = `worker-${hostname()}-${process.pid}`;
const IDLE_MS = 5_000;
const MAX_IDLE_MS = 30_000;
let stopping = false;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(JSON.stringify({ msg: "worker stopping", signal, workerId }));
    stopping = true;
  });
}

console.log(JSON.stringify({ msg: "worker started", workerId }));
let idle = IDLE_MS;
while (!stopping) {
  try {
    await enqueueRecurringJobs();
    const result = await runDueJobs({ workerId, budgetMs: 20_000 });
    if (result.claimed) {
      console.log(JSON.stringify({ msg: "jobs processed", workerId, ...result }));
      idle = IDLE_MS;
      continue;
    }
    idle = Math.min(MAX_IDLE_MS, idle * 1.5);
  } catch (error) {
    console.error(JSON.stringify({ msg: "worker loop error", workerId, error: String(error) }));
    idle = MAX_IDLE_MS;
  }
  await sleep(idle);
}

await db.$disconnect();
console.log(JSON.stringify({ msg: "worker stopped", workerId }));
