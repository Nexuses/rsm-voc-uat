import { describe, expect, it } from "vitest";
import { automationActionsSchema } from "@/lib/automation/actions";
import { conditionSchema, evaluateCondition } from "@/lib/automation/conditions";
import { checkFatigue } from "@/lib/automation/fatigue";
import { renderTemplate, unknownPlaceholders } from "@/lib/messaging/render";

const DAY = 24 * 60 * 60 * 1000;

describe("evaluateCondition", () => {
  const facts = {
    event: { type: "SURVEY_RESPONSE_SUBMITTED" },
    response: { nps: 4, csat: 5, attentionMetrics: ["NPS"], language: "ar" },
  };

  it("handles nested all/any/not trees", () => {
    const condition = conditionSchema.parse({
      all: [
        { field: "response.nps", op: "lte", value: 6 },
        { any: [{ field: "response.language", op: "eq", value: "ar" }, { field: "x", op: "exists" }] },
        { not: { field: "response.csat", op: "lt", value: 3 } },
      ],
    });
    expect(evaluateCondition(condition, facts)).toBe(true);
  });

  it("never matches on missing facts or type mismatches", () => {
    expect(evaluateCondition({ field: "response.ces", op: "lte", value: 3 }, facts)).toBe(false);
    expect(evaluateCondition({ field: "response.nps", op: "gt", value: "1" }, facts)).toBe(false);
    expect(evaluateCondition({ field: "response.attentionMetrics", op: "contains", value: "NPS" }, facts)).toBe(true);
    expect(evaluateCondition({ field: "response.language", op: "in", value: ["en", "ar"] }, facts)).toBe(true);
  });

  it("rejects malformed trees and unsafe field paths", () => {
    expect(conditionSchema.safeParse({ all: [] }).success).toBe(false);
    expect(conditionSchema.safeParse({ field: "__proto__[0]", op: "eq", value: 1 }).success).toBe(false);
    expect(conditionSchema.safeParse({ field: "a", op: "regex", value: ".*" }).success).toBe(false);
  });
});

describe("automation actions", () => {
  it("only allows known action types", () => {
    expect(
      automationActionsSchema.safeParse([{ type: "request_message", templateKey: "detractor-apology" }]).success
    ).toBe(true);
    expect(automationActionsSchema.safeParse([{ type: "send_email", to: "x@y.z" }]).success).toBe(false);
    expect(
      automationActionsSchema.safeParse([{ type: "notify", permission: "not.real", title: "Hello" }]).success
    ).toBe(false);
  });
});

describe("checkFatigue", () => {
  const now = new Date("2026-09-28T12:00:00Z");
  const policy = { maxPerContact: 2, maxPerAccount: 3, windowDays: 30, minIntervalDays: 7 };

  it("allows when history is clear", () => {
    expect(checkFatigue({ policy, contactSends: [], now })).toEqual({ allowed: true });
  });

  it("enforces the minimum interval", () => {
    const decision = checkFatigue({ policy, contactSends: [new Date(now.getTime() - 2 * DAY)], now });
    expect(decision).toMatchObject({ allowed: false, reason: "min_interval" });
    if (!decision.allowed) {
      expect(decision.releaseAt.getTime()).toBe(now.getTime() + 5 * DAY);
    }
  });

  it("enforces per-contact and per-account caps inside the window only", () => {
    const old = new Date(now.getTime() - 40 * DAY);
    const recent = [new Date(now.getTime() - 20 * DAY), new Date(now.getTime() - 10 * DAY)];
    expect(checkFatigue({ policy, contactSends: [old, ...recent], now })).toMatchObject({
      allowed: false,
      reason: "contact_limit",
    });
    expect(
      checkFatigue({
        policy,
        contactSends: [recent[0]],
        accountSends: [...recent, new Date(now.getTime() - 15 * DAY)],
        now,
      })
    ).toMatchObject({ allowed: false, reason: "account_limit" });
  });
});

describe("renderTemplate", () => {
  it("fills known placeholders and blanks the rest", () => {
    expect(renderTemplate("Dear {{ name }} at {{company}}{{missing}}", { name: " Sara ", company: null })).toBe(
      "Dear Sara at "
    );
    expect(unknownPlaceholders("{{name}} {{email}} {{phone}}")).toEqual(["email", "phone"]);
  });
});
