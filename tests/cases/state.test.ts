import { describe, expect, it } from "vitest";
import {
  BOARD_CASE_STATUSES,
  OPEN_CASE_STATUSES,
  allowedTransitions,
  canTransition,
  severityForAttentionMetrics,
} from "@/lib/cases/state";
import { isCaseView } from "@/lib/cases/queries";
import { decideNeedsAttention } from "@/lib/jobs/score-and-evaluate";
import { retryDelayMs } from "@/lib/jobs/queue";

describe("case state machine", () => {
  it("allows the documented forward path", () => {
    expect(canTransition("new", "triaged")).toBe(true);
    expect(canTransition("triaged", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "awaiting_client")).toBe(true);
    expect(canTransition("awaiting_client", "resolved")).toBe(true);
    expect(canTransition("resolved", "closed")).toBe(true);
    expect(canTransition("closed", "reopened")).toBe(true);
  });

  it("blocks skipping straight to resolved or leaving closed except by reopen", () => {
    expect(canTransition("new", "resolved")).toBe(false);
    expect(canTransition("closed", "in_progress")).toBe(false);
    expect(canTransition("new", "bogus")).toBe(false);
    expect(allowedTransitions("unknown")).toEqual([]);
  });

  it("raises severity when several metrics are low", () => {
    expect(severityForAttentionMetrics(["CSAT"])).toBe("medium");
    expect(severityForAttentionMetrics(["CSAT", "NPS"])).toBe("high");
  });

  it("keeps closed off the escalations board while including resolved", () => {
    expect(BOARD_CASE_STATUSES).toContain("resolved");
    expect(BOARD_CASE_STATUSES).toContain("reopened");
    expect(BOARD_CASE_STATUSES).not.toContain("closed");
    expect(OPEN_CASE_STATUSES).not.toContain("resolved");
    expect(isCaseView("board")).toBe(true);
    expect(isCaseView("open")).toBe(true);
    expect(isCaseView("bogus")).toBe(false);
  });
});

describe("needs-attention decision", () => {
  it("only creates cases in live mode", () => {
    expect(decideNeedsAttention({ mode: "live", metrics: [] }).outcome).toBe("not_matched");
    expect(decideNeedsAttention({ mode: "shadow", metrics: ["NPS"] }).outcome).toBe(
      "matched_shadow"
    );
    expect(decideNeedsAttention({ mode: "live", metrics: ["NPS"] }).outcome).toBe(
      "create_case"
    );
  });
});

describe("job retry backoff", () => {
  it("doubles from 30s and caps at one hour", () => {
    expect(retryDelayMs(1)).toBe(30_000);
    expect(retryDelayMs(2)).toBe(60_000);
    expect(retryDelayMs(20)).toBe(60 * 60 * 1000);
  });
});
