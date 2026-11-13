import { db } from "@/lib/db";

export async function jobQueueStats(now = new Date()) {
  const [queued, running, dead, oldest] = await Promise.all([
    db.job.count({ where: { status: "queued", runAt: { lte: now } } }),
    db.job.count({ where: { status: "running" } }),
    db.job.count({ where: { status: "dead" } }),
    db.job.findFirst({
      where: { status: "queued", runAt: { lte: now } },
      orderBy: { runAt: "asc" },
      select: { runAt: true },
    }),
  ]);
  return {
    queued,
    running,
    dead,
    oldestPendingSeconds: oldest
      ? Math.max(0, Math.round((now.getTime() - oldest.runAt.getTime()) / 1000))
      : 0,
  };
}
