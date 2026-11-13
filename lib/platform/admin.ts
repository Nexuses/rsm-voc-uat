import { HttpError } from "@/lib/api/http-error";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  clearFlagCache,
  FEATURE_FLAGS,
  flagEnvName,
  isFlagMode,
  type FeatureFlagKey,
  type FlagMode,
} from "@/lib/flags";
import { jobQueueStats } from "@/lib/jobs/stats";

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return Object.prototype.hasOwnProperty.call(FEATURE_FLAGS, value);
}

export async function listFeatureFlags() {
  const rows = await db.featureFlag.findMany();
  const stored = new Map(rows.map((row) => [row.key, row]));
  return (Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]).map((key) => {
    const row = stored.get(key);
    const envName = flagEnvName(key);
    const envValue = process.env[envName]?.trim().toLowerCase();
    const envOverride = isFlagMode(envValue) ? envValue : null;
    const storedMode = row && isFlagMode(row.mode) ? row.mode : null;
    return {
      key,
      description: FEATURE_FLAGS[key].description,
      defaultMode: FEATURE_FLAGS[key].defaultMode as FlagMode,
      storedMode,
      envName,
      envOverride,
      effectiveMode: envOverride ?? storedMode ?? (FEATURE_FLAGS[key].defaultMode as FlagMode),
      updatedAt: row?.updatedAt ?? null,
      updatedByUserId: row?.updatedByUserId ?? null,
    };
  });
}

export async function setFeatureFlag(key: FeatureFlagKey, mode: FlagMode, actorUserId: string) {
  const before = await db.featureFlag.findUnique({ where: { key } });
  const row = await db.featureFlag.upsert({
    where: { key },
    create: { key, mode, description: FEATURE_FLAGS[key].description, updatedByUserId: actorUserId },
    update: { mode, updatedByUserId: actorUserId },
  });
  clearFlagCache();
  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: "feature_flag.updated",
    resourceType: "FeatureFlag",
    resourceId: key,
    before: { mode: before?.mode ?? FEATURE_FLAGS[key].defaultMode },
    after: { mode: row.mode },
    source: "api",
  });
  return row;
}

export async function listDeadJobs(limit = 50) {
  const [stats, dead] = await Promise.all([
    jobQueueStats(),
    db.job.findMany({
      where: { status: "dead" },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        jobKey: true,
        attempts: true,
        maxAttempts: true,
        lastError: true,
        correlationId: true,
        updatedAt: true,
      },
    }),
  ]);
  return {
    stats,
    dead: dead.map((job) => ({ ...job, lastError: job.lastError?.slice(0, 500) ?? null })),
  };
}

export async function replayDeadJob(id: string, actorUserId: string) {
  const claimed = await db.job.updateMany({
    where: { id, status: "dead" },
    data: { status: "queued", attempts: 0, runAt: new Date(), lockedAt: null, lockedBy: null },
  });
  if (claimed.count === 0) throw new HttpError("Only dead jobs can be replayed", 409);
  const job = await db.job.findUniqueOrThrow({
    where: { id },
    select: { id: true, type: true, jobKey: true },
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: "job.replayed",
    resourceType: "Job",
    resourceId: id,
    after: { type: job.type, jobKey: job.jobKey },
    source: "api",
  });
  return job;
}
