import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryTable } from "../helpers/memory-db";

const state = vi.hoisted(() => ({
  tables: {} as Record<string, unknown>,
  emitted: [] as string[],
  audits: [] as string[],
}));

vi.mock("@/lib/db", () => ({
  get db() {
    return state.tables;
  },
}));

vi.mock("@/lib/events/emit", () => ({
  emitEvent: vi.fn(async (input: { idempotencyKey: string }) => {
    const table = state.tables.domainEvent as ReturnType<typeof createMemoryTable>;
    table.rows.push({ id: input.idempotencyKey, idempotencyKey: input.idempotencyKey });
    state.emitted.push(input.idempotencyKey);
  }),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(async (input: { action: string }) => {
    state.audits.push(input.action);
  }),
}));

import { handleSlaMonitor } from "@/lib/cases/sla";

const now = new Date("2026-09-28T12:00:00.000Z");

beforeEach(() => {
  state.emitted = [];
  state.audits = [];
  const cases = [
    { id: "c1", status: "new", slaDueAt: new Date("2026-09-27T00:00:00.000Z"), correlationId: null },
  ];
  state.tables = {
    case: { findMany: vi.fn(async () => cases) },
    domainEvent: createMemoryTable([["idempotencyKey"]]),
    caseActivity: createMemoryTable(),
    escalation: createMemoryTable([["caseId", "level", "reason"]]),
  };
});

describe("SLA monitor", () => {
  it("breaches an overdue case exactly once across repeated runs", async () => {
    expect(await handleSlaMonitor(now)).toEqual({ checked: 1, breached: 1 });
    expect(await handleSlaMonitor(now)).toEqual({ checked: 1, breached: 0 });

    expect(state.emitted).toEqual(["case:c1:sla_breached"]);
    expect(state.audits).toEqual(["case.sla_breached"]);
    const escalations = state.tables.escalation as ReturnType<typeof createMemoryTable>;
    expect(escalations.rows).toHaveLength(1);
    expect(escalations.rows[0]).toMatchObject({ caseId: "c1", level: 1, reason: "sla_breached" });
  });
});
