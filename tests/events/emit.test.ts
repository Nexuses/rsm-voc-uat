import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryTable } from "../helpers/memory-db";

const state = vi.hoisted(() => ({
  mode: "live" as "off" | "shadow" | "live",
  automation: "off" as "off" | "shadow" | "live",
  tables: {} as Record<string, unknown>,
}));

vi.mock("@/lib/db", () => ({
  get db() {
    return state.tables;
  },
}));

vi.mock("@/lib/flags", () => ({
  getFlagMode: vi.fn(async (key: string) =>
    key === "automation.rules" ? state.automation : state.mode
  ),
}));

import { emitEvent, emitEventSafely, jobKeyFor } from "@/lib/events/emit";

type Table = ReturnType<typeof createMemoryTable>;

function tables() {
  return state.tables as { domainEvent: Table; job: Table };
}

const input = {
  type: "SURVEY_RESPONSE_SUBMITTED" as const,
  idempotencyKey: "response:r1:submitted",
  aggregateId: "r1",
  payload: { responseId: "r1", surveyVersion: "three-metric-v2", source: "voice" as const },
};

beforeEach(() => {
  state.mode = "live";
  state.automation = "off";
  const domainEvent = createMemoryTable([["idempotencyKey"]]);
  const job = createMemoryTable([["jobKey"]]);
  state.tables = {
    domainEvent,
    job,
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ domainEvent, job }),
  };
});

describe("emitEvent", () => {
  it("records one event and one job even when emitted repeatedly", async () => {
    const first = await emitEvent(input);
    const second = await emitEvent(input);

    expect(second?.id).toBe(first?.id);
    expect(tables().domainEvent.rows).toHaveLength(1);
    expect(tables().job.rows).toHaveLength(1);
    expect(tables().job.rows[0]).toMatchObject({
      type: "response.score_and_evaluate",
      jobKey: jobKeyFor("response.score_and_evaluate", String(first?.id)),
    });
  });

  it("adds one automation job per event when automation rules are enabled", async () => {
    state.automation = "shadow";
    const event = await emitEvent({
      type: "CASE_RESOLVED",
      idempotencyKey: "case:c1:resolved:1",
      aggregateId: "c1",
      payload: { caseId: "c1" },
    });
    await emitEvent({
      type: "CASE_RESOLVED",
      idempotencyKey: "case:c1:resolved:1",
      aggregateId: "c1",
      payload: { caseId: "c1" },
    });
    expect(tables().job.rows).toEqual([
      expect.objectContaining({
        type: "automation.evaluate",
        jobKey: jobKeyFor("automation.evaluate", String(event?.id)),
      }),
    ]);
    expect(tables().domainEvent.rows[0].dispatchedAt).toBeInstanceOf(Date);
  });

  it("rejects payloads that break the catalog contract", async () => {
    await expect(
      emitEvent({ ...input, payload: { responseId: "", surveyVersion: "", source: "voice" } })
    ).rejects.toThrow();
  });

  it("does nothing when the outbox flag is off", async () => {
    state.mode = "off";
    expect(await emitEvent(input)).toBeNull();
    expect(tables().domainEvent.rows).toHaveLength(0);
  });

  it("never throws from the safe variant", async () => {
    state.tables = {
      $transaction: async () => {
        throw new Error("relation DomainEvent does not exist");
      },
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(emitEventSafely(input)).resolves.toBeNull();
    errorSpy.mockRestore();
  });
});
