import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryTable } from "../helpers/memory-db";

const state = vi.hoisted(() => ({
  tables: {} as Record<string, ReturnType<typeof import("../helpers/memory-db").createMemoryTable>>,
  audit: vi.fn(),
  clearFlagCache: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    get featureFlag() {
      return state.tables.featureFlag;
    },
    get job() {
      return state.tables.job;
    },
  },
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog: state.audit }));
vi.mock("@/lib/jobs/stats", () => ({
  jobQueueStats: vi.fn(async () => ({ queued: 0, running: 0, dead: 1, oldestPendingSeconds: 0 })),
}));
vi.mock("@/lib/flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/flags")>()),
  clearFlagCache: state.clearFlagCache,
}));

import { isFeatureFlagKey, listFeatureFlags, replayDeadJob, setFeatureFlag } from "@/lib/platform/admin";

describe("platform admin", () => {
  beforeEach(() => {
    state.tables = { featureFlag: createMemoryTable([["key"]]), job: createMemoryTable() };
    state.audit.mockReset();
    state.clearFlagCache.mockReset();
  });
  afterEach(() => {
    delete process.env.FEATURE_FLAG_MESSAGING_SEND;
  });

  it("only accepts catalogued flag keys", () => {
    expect(isFeatureFlagKey("messaging.send")).toBe(true);
    expect(isFeatureFlagKey("constructor")).toBe(false);
    expect(isFeatureFlagKey("made.up")).toBe(false);
  });

  it("reports env overrides as the effective mode", async () => {
    process.env.FEATURE_FLAG_MESSAGING_SEND = "shadow";
    state.tables.featureFlag.rows.push({ id: "messaging.send", key: "messaging.send", mode: "live" });
    const flag = (await listFeatureFlags()).find((f) => f.key === "messaging.send");
    expect(flag).toMatchObject({ storedMode: "live", envOverride: "shadow", effectiveMode: "shadow" });
  });

  it("audits flag changes with before/after and clears the cache", async () => {
    await setFeatureFlag("messaging.send", "shadow", "user-1");
    expect(state.clearFlagCache).toHaveBeenCalled();
    expect(state.audit.mock.calls[0][0]).toMatchObject({
      action: "feature_flag.updated",
      before: { mode: "off" },
      after: { mode: "shadow" },
    });
  });

  it("replays dead jobs only", async () => {
    state.tables.job.rows.push(
      { id: "job-1", type: "messages.send", jobKey: "k1", status: "dead", attempts: 5 },
      { id: "job-2", type: "messages.send", jobKey: "k2", status: "succeeded", attempts: 1 }
    );
    await replayDeadJob("job-1", "user-1");
    expect(state.tables.job.rows[0]).toMatchObject({ status: "queued", attempts: 0 });
    expect(state.audit.mock.calls[0][0]).toMatchObject({ action: "job.replayed", resourceId: "job-1" });
    await expect(replayDeadJob("job-2", "user-1")).rejects.toMatchObject({ status: 409 });
  });
});
