import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryTable } from "../helpers/memory-db";

const state = vi.hoisted(() => ({
  mode: "shadow" as "off" | "shadow" | "live",
  tables: {} as Record<string, ReturnType<typeof import("../helpers/memory-db").createMemoryTable>>,
  cases: new Map<string, { id: string }>(),
  createCase: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  get db() {
    return state.tables;
  },
}));

vi.mock("@/lib/flags", () => ({
  getFlagMode: vi.fn(async () => state.mode),
}));

vi.mock("@/lib/cases/service", () => ({
  createNeedsAttentionCase: state.createCase,
}));

import { handleScoreAndEvaluate } from "@/lib/jobs/score-and-evaluate";
import type { ClaimedJob } from "@/lib/jobs/queue";

function job(domainEventId = "event-1"): ClaimedJob {
  return {
    id: "job-1",
    type: "response.score_and_evaluate",
    jobKey: `response.score_and_evaluate:${domainEventId}`,
    payload: { domainEventId },
    attempts: 1,
    maxAttempts: 5,
    correlationId: "corr-1",
  };
}

function seed(scores: { csatScore: number; cesScore: number; npsScore: number }, excludedAt: Date | null = null) {
  state.tables.domainEvent.rows.push({
    id: "event-1",
    type: "SURVEY_RESPONSE_SUBMITTED",
    payload: { responseId: "response-1" },
    correlationId: "corr-1",
  });
  state.tables.response.rows.push({
    id: "response-1",
    surveyVersion: "three-metric-v2",
    excludedAt,
    answers: [
      { question_number: 1, metric: "csat", rating: scores.csatScore, reason_text: " Slow replies " },
      { question_number: 2, metric: "ces", rating: scores.cesScore, reason_text: "" },
      { question_number: 3, rating: scores.npsScore },
    ],
    ...scores,
  });
}

beforeEach(() => {
  state.mode = "shadow";
  state.cases.clear();
  state.tables = {
    domainEvent: createMemoryTable([["idempotencyKey"]]),
    response: createMemoryTable(),
    scoreDefinition: createMemoryTable([["key", "version"]]),
    scoreResult: createMemoryTable([["responseId", "scoreDefinitionId", "metric"]]),
    automationExecution: createMemoryTable([["ruleKey", "ruleVersion", "domainEventId"]]),
    responseAnswer: createMemoryTable([["responseId", "questionKey"]]),
    surveyQuestion: createMemoryTable([["surveyVersionId", "questionKey"]]),
  };
  state.createCase.mockReset();
  state.createCase.mockImplementation(async (input: { responseId: string }) => {
    const existing = state.cases.get(input.responseId);
    if (existing) return { created: false, case: existing };
    const record = { id: `case-${state.cases.size + 1}` };
    state.cases.set(input.responseId, record);
    return { created: true, case: record };
  });
});

describe("response.score_and_evaluate", () => {
  it("writes one ScoreResult per metric and is stable on re-run", async () => {
    seed({ csatScore: 5, cesScore: 6, npsScore: 9 });
    await handleScoreAndEvaluate(job());
    await handleScoreAndEvaluate(job());

    expect(state.tables.scoreResult.rows).toHaveLength(3);
    expect(state.tables.scoreDefinition.rows).toHaveLength(1);
    expect(state.tables.responseAnswer.rows).toHaveLength(3);
    expect(state.tables.responseAnswer.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ questionKey: "csat", numericValue: 5, textValue: "Slow replies" }),
        expect.objectContaining({ questionKey: "ces", numericValue: 6, textValue: null }),
        expect.objectContaining({ questionKey: "nps", metric: "nps", numericValue: 9 }),
      ])
    );
    expect(state.tables.automationExecution.rows[0]).toMatchObject({
      outcome: "not_matched",
      mode: "shadow",
    });
  });

  it("records the decision without creating a case in shadow mode", async () => {
    seed({ csatScore: 2, cesScore: 3, npsScore: 8 });
    await handleScoreAndEvaluate(job());

    expect(state.createCase).not.toHaveBeenCalled();
    expect(state.tables.automationExecution.rows[0]).toMatchObject({
      outcome: "matched_shadow",
      detail: expect.objectContaining({ metrics: ["CSAT", "CES"], severity: "high" }),
    });
  });

  it("gives one execution and one case when the same event is processed twice", async () => {
    state.mode = "live";
    seed({ csatScore: 1, cesScore: 6, npsScore: 9 });
    await handleScoreAndEvaluate(job());
    await handleScoreAndEvaluate(job());

    expect(state.tables.automationExecution.rows).toHaveLength(1);
    expect(state.createCase).toHaveBeenCalledOnce();
    expect(state.cases.size).toBe(1);
    expect(state.tables.automationExecution.rows[0]).toMatchObject({
      outcome: "case_created",
      detail: expect.objectContaining({ caseId: "case-1", severity: "medium" }),
    });
  });

  it("finishes a pending execution after a killed run without a second case", async () => {
    state.mode = "live";
    seed({ csatScore: 1, cesScore: 2, npsScore: 3 });
    state.createCase.mockImplementationOnce(async (input: { responseId: string }) => {
      state.cases.set(input.responseId, { id: "case-1" });
      throw new Error("worker killed after commit");
    });

    await expect(handleScoreAndEvaluate(job())).rejects.toThrow("worker killed");
    expect(state.tables.automationExecution.rows[0].outcome).toBe("pending");

    await handleScoreAndEvaluate(job());
    expect(state.cases.size).toBe(1);
    expect(state.tables.automationExecution.rows[0]).toMatchObject({
      outcome: "case_exists",
    });
  });

  it("skips excluded responses and records nothing when the flag is off", async () => {
    seed({ csatScore: 1, cesScore: 1, npsScore: 0 }, new Date());
    await handleScoreAndEvaluate(job());
    expect(state.tables.scoreResult.rows).toHaveLength(0);
    expect(state.tables.automationExecution.rows[0].outcome).toBe("skipped");

    state.tables.automationExecution.rows.length = 0;
    state.mode = "off";
    await handleScoreAndEvaluate(job());
    expect(state.tables.automationExecution.rows).toHaveLength(0);
  });
});
