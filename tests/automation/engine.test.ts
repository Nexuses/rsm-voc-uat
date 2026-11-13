import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryTable } from "../helpers/memory-db";

const state = vi.hoisted(() => ({
  mode: "shadow" as "off" | "shadow" | "live",
  tables: {} as Record<string, ReturnType<typeof import("../helpers/memory-db").createMemoryTable>>,
  enqueue: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  get db() {
    return state.tables;
  },
}));
vi.mock("@/lib/flags", () => ({ getFlagMode: vi.fn(async () => state.mode) }));
vi.mock("@/lib/jobs/queue", () => ({ enqueueJob: state.enqueue }));
vi.mock("@/lib/automation/recipients", () => ({
  usersWithPermission: vi.fn(async () => ["user-1", "user-2"]),
}));

import { handleAutomationEvaluate } from "@/lib/automation/engine";
import type { ClaimedJob } from "@/lib/jobs/queue";

const job: ClaimedJob = {
  id: "job-1",
  type: "automation.evaluate",
  jobKey: "automation.evaluate:event-1",
  payload: { domainEventId: "event-1" },
  attempts: 1,
  maxAttempts: 5,
  correlationId: null,
};

function addVersion(overrides: Record<string, unknown> = {}) {
  state.tables.automationRuleVersion.rows.push({
    id: `v-${state.tables.automationRuleVersion.rows.length + 1}`,
    version: 1,
    eventType: "SURVEY_RESPONSE_SUBMITTED",
    status: "active",
    mode: "live",
    delayMinutes: 0,
    conditions: { field: "response.nps", op: "lte", value: 6 },
    actions: [
      { type: "create_task", title: "Call the client" },
      { type: "notify", permission: "cases.read", title: "Detractor" },
      { type: "request_message", templateKey: "detractor-apology" },
    ],
    rule: { key: "detractor", active: true },
    ...overrides,
  });
}

beforeEach(() => {
  state.mode = "live";
  state.enqueue.mockReset();
  state.tables = {
    domainEvent: createMemoryTable(),
    response: createMemoryTable(),
    automationRuleVersion: createMemoryTable(),
    automationExecution: createMemoryTable([["ruleKey", "ruleVersion", "domainEventId"]]),
    task: createMemoryTable(),
    notification: createMemoryTable(),
    approvalRequest: createMemoryTable(),
  };
  state.tables.domainEvent.rows.push({
    id: "event-1",
    type: "SURVEY_RESPONSE_SUBMITTED",
    payload: { responseId: "response-1" },
    correlationId: "corr-1",
    occurredAt: new Date("2026-09-28T10:00:00Z"),
  });
  state.tables.response.rows.push({
    id: "response-1",
    surveyVersion: "three-metric-v2",
    language: "en",
    csatScore: 4,
    cesScore: 5,
    npsScore: 3,
    excludedAt: null,
    accountId: "account-1",
    client: { tier: "key" },
  });
});

describe("automation.evaluate", () => {
  it("runs live actions once even when the job is retried", async () => {
    addVersion();
    await handleAutomationEvaluate(job);
    await handleAutomationEvaluate(job);

    expect(state.tables.automationExecution.rows).toHaveLength(1);
    expect(state.tables.automationExecution.rows[0].outcome).toBe("actions_executed");
    expect(state.tables.task.rows).toHaveLength(1);
    expect(state.tables.notification.rows).toHaveLength(2);
    expect(state.tables.approvalRequest.rows).toHaveLength(1);
    expect(state.tables.approvalRequest.rows[0]).toMatchObject({
      kind: "message_send",
      requestedByType: "system",
      payload: expect.objectContaining({ templateKey: "detractor-apology", responseId: "response-1" }),
    });
  });

  it("only records intent when either the flag or the version is in shadow", async () => {
    addVersion({ mode: "shadow" });
    await handleAutomationEvaluate(job);
    expect(state.tables.automationExecution.rows[0]).toMatchObject({
      mode: "shadow",
      outcome: "matched_shadow",
    });
    expect(state.tables.task.rows).toHaveLength(0);
    expect(state.tables.approvalRequest.rows).toHaveLength(0);
  });

  it("records not_matched, invalid rules, and does nothing when off", async () => {
    addVersion({ conditions: { field: "response.nps", op: "gte", value: 9 } });
    addVersion({ rule: { key: "broken", active: true }, actions: [{ type: "delete_everything" }] });
    await handleAutomationEvaluate(job);
    const outcomes = state.tables.automationExecution.rows.map((row) => row.outcome).sort();
    expect(outcomes).toEqual(["failed", "not_matched"]);

    state.tables.automationExecution.rows.length = 0;
    state.mode = "off";
    await handleAutomationEvaluate(job);
    expect(state.tables.automationExecution.rows).toHaveLength(0);
  });

  it("defers delayed versions to their own job", async () => {
    addVersion({ delayMinutes: 60 });
    await handleAutomationEvaluate(job);
    expect(state.tables.automationExecution.rows).toHaveLength(0);
    expect(state.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "automation.evaluate_version",
        runAt: new Date("2026-09-28T11:00:00Z"),
      })
    );
  });
});
