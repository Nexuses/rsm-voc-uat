import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryTable } from "../helpers/memory-db";

const state = vi.hoisted(() => ({
  flag: "off" as "off" | "shadow" | "live",
  tables: {} as Record<string, ReturnType<typeof import("../helpers/memory-db").createMemoryTable>>,
  responses: [] as unknown[],
  enroll: vi.fn(),
  emit: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    get trainingRule() {
      return state.tables.trainingRule;
    },
    get trainingCourse() {
      return state.tables.trainingCourse;
    },
    get trainingAssignment() {
      return state.tables.trainingAssignment;
    },
    get employee() {
      return state.tables.employee;
    },
    response: { findMany: vi.fn(async () => state.responses) },
  },
}));
vi.mock("@/lib/flags", () => ({ getFlagMode: vi.fn(async () => state.flag) }));
vi.mock("@/lib/providers", () => ({ getLmsProvider: () => ({ name: "test", enroll: state.enroll }) }));
vi.mock("@/lib/events/emit", () => ({ emitEventSafely: state.emit }));
vi.mock("@/lib/audit", () => ({ writeAuditLog: state.audit }));

import { evaluateTrainingRule, trainingRuleConfigSchema, type TrainingRuleConfig } from "@/lib/training/rules";
import { runTrainingRules } from "@/lib/training/service";

const NOW = new Date("2026-09-28T12:00:00Z");
const config: TrainingRuleConfig = {
  metric: "csat",
  operator: "lte",
  threshold: 2,
  minOccurrences: 2,
  windowDays: 90,
  courseKey: "client-care",
  role: "partner",
};

function obs(id: string, daysAgo: number, csat: number | null, partner = "emp-1") {
  return {
    responseId: id,
    submittedAt: new Date(NOW.getTime() - daysAgo * 86_400_000),
    partnerEmployeeId: partner,
    managerEmployeeId: "mgr-1",
    scores: { csat, ces: null, nps: null },
  };
}

describe("evaluateTrainingRule", () => {
  it("requires minOccurrences hits inside the window for the chosen role", () => {
    const matches = evaluateTrainingRule(
      config,
      [obs("r1", 1, 1), obs("r2", 10, 2), obs("r3", 200, 1), obs("r4", 5, 5), obs("r5", 3, 1, "emp-2")],
      NOW
    );
    expect(matches).toEqual([{ employeeId: "emp-1", responseIds: ["r1", "r2"] }]);
  });

  it("supports gte comparisons and manager attribution, ignoring missing scores", () => {
    const matches = evaluateTrainingRule(
      { ...config, operator: "gte", threshold: 5, role: "manager", minOccurrences: 1 },
      [obs("r1", 1, 5), obs("r2", 1, null)],
      NOW
    );
    expect(matches).toEqual([{ employeeId: "mgr-1", responseIds: ["r1"] }]);
  });

  it("rejects incomplete configs", () => {
    expect(trainingRuleConfigSchema.safeParse({ ...config, windowDays: 0 }).success).toBe(false);
    expect(trainingRuleConfigSchema.safeParse({ metric: "csat" }).success).toBe(false);
  });
});

describe("runTrainingRules", () => {
  beforeEach(() => {
    state.tables = {
      trainingRule: createMemoryTable(),
      trainingCourse: createMemoryTable(),
      trainingAssignment: createMemoryTable([["dedupeKey"]]),
      employee: createMemoryTable(),
    };
    state.tables.trainingCourse.rows.push({ id: "course-1", key: "client-care", title: "Client care", active: true });
    state.tables.employee.rows.push({ id: "emp-1", email: "partner@example.com" });
    state.responses = ["r1", "r2"].map((id, i) => ({
      id,
      createdAt: new Date(NOW.getTime() - (i + 1) * 86_400_000),
      csatScore: 1,
      cesScore: null,
      npsScore: null,
      engagement: { partnerEmployeeId: "emp-1", managerEmployeeId: null },
    }));
    state.enroll.mockReset().mockResolvedValue({ externalId: "lms-1" });
    state.emit.mockReset();
    state.audit.mockReset();
  });

  function addRule(mode: "shadow" | "live") {
    state.tables.trainingRule.rows.push({ id: "rule-1", key: "low-csat", mode, active: true, config });
  }

  it("does nothing when the flag is off", async () => {
    state.flag = "off";
    addRule("live");
    await expect(runTrainingRules(NOW)).resolves.toEqual({ rules: 0, proposed: 0, assigned: 0 });
    expect(state.tables.trainingAssignment.rows).toHaveLength(0);
  });

  it("only proposes in shadow, even for a live rule", async () => {
    state.flag = "shadow";
    addRule("live");
    await expect(runTrainingRules(NOW)).resolves.toMatchObject({ proposed: 1, assigned: 0 });
    expect(state.tables.trainingAssignment.rows[0]).toMatchObject({ status: "proposed", sourceResponseIds: ["r1", "r2"] });
    expect(state.enroll).not.toHaveBeenCalled();
    expect(state.emit).not.toHaveBeenCalled();
  });

  it("only proposes when the rule itself is in shadow", async () => {
    state.flag = "live";
    addRule("shadow");
    await runTrainingRules(NOW);
    expect(state.tables.trainingAssignment.rows[0]).toMatchObject({ status: "proposed" });
    expect(state.enroll).not.toHaveBeenCalled();
  });

  it("assigns once in live mode, enrolls, emits and audits", async () => {
    state.flag = "live";
    addRule("live");
    await expect(runTrainingRules(NOW)).resolves.toMatchObject({ proposed: 1, assigned: 1 });
    await expect(runTrainingRules(NOW)).resolves.toMatchObject({ proposed: 0, assigned: 0 });
    expect(state.tables.trainingAssignment.rows).toHaveLength(1);
    expect(state.tables.trainingAssignment.rows[0]).toMatchObject({ status: "assigned", externalId: "lms-1" });
    expect(state.enroll).toHaveBeenCalledWith({ employeeEmail: "partner@example.com", courseKey: "client-care" });
    expect(state.emit).toHaveBeenCalledOnce();
    expect(state.emit.mock.calls[0][0]).toMatchObject({ type: "TRAINING_RULE_TRIGGERED" });
    expect(state.audit.mock.calls[0][0]).toMatchObject({ action: "training.assigned" });
  });

  it("keeps the assignment when LMS enrollment fails", async () => {
    state.flag = "live";
    addRule("live");
    state.enroll.mockRejectedValue(new Error("lms down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(runTrainingRules(NOW)).resolves.toMatchObject({ assigned: 1 });
    expect(state.tables.trainingAssignment.rows[0]).toMatchObject({ status: "assigned", externalId: null });
  });
});
