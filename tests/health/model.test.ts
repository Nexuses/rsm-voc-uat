import { describe, expect, it } from "vitest";
import { closeBlockedReason } from "@/lib/cases/state";
import {
  computeAccountHealth,
  DEFAULT_HEALTH_MODEL,
  healthModelConfigSchema,
} from "@/lib/health/model";

const config = DEFAULT_HEALTH_MODEL.config;

describe("computeAccountHealth", () => {
  it("is unknown without enough responses", () => {
    const result = computeAccountHealth({ responses: [], openCases: 0, config });
    expect(result).toMatchObject({ score: null, state: "unknown" });
  });

  it("scores a fully satisfied account as healthy", () => {
    const result = computeAccountHealth({
      responses: [{ csat: 5, ces: 7, nps: 10 }],
      openCases: 0,
      config,
    });
    expect(result.score).toBe(100);
    expect(result.state).toBe("healthy");
  });

  it("weights stakeholders and penalizes open cases", () => {
    const equal = computeAccountHealth({
      responses: [
        { csat: 5, ces: 7, nps: 10, weight: 1 },
        { csat: 1, ces: 1, nps: 0, weight: 1 },
      ],
      openCases: 0,
      config,
    });
    const seniorUnhappy = computeAccountHealth({
      responses: [
        { csat: 5, ces: 7, nps: 10, weight: 1 },
        { csat: 1, ces: 1, nps: 0, weight: 3 },
      ],
      openCases: 2,
      config,
    });
    expect(equal.score).toBeGreaterThan(seniorUnhappy.score ?? 0);
    expect(seniorUnhappy.components.cases.value).toBe(50);
    expect(seniorUnhappy.state).toBe("at_risk");
  });

  it("counts passives as half in the NPS component", () => {
    const result = computeAccountHealth({
      responses: [{ csat: null, ces: null, nps: 8 }],
      openCases: 0,
      config: { ...config, weights: { csat: 0, ces: 0, nps: 1, cases: 0 } },
    });
    expect(result.score).toBe(50);
  });

  it("rejects inverted thresholds", () => {
    expect(
      healthModelConfigSchema.safeParse({ ...config, thresholds: { healthy: 40, watch: 60 } }).success
    ).toBe(false);
  });
});

describe("closeBlockedReason", () => {
  const base = { requiresClientConfirmation: true, clientConfirmedAt: null };

  it("blocks closing a resolved case until the client confirms", () => {
    expect(closeBlockedReason({ ...base, from: "resolved", to: "closed" })).toMatch(/confirmation/);
    expect(
      closeBlockedReason({ ...base, from: "resolved", to: "closed", clientConfirmedAt: new Date() })
    ).toBeNull();
  });

  it("still allows dismissing untouched cases and cases that do not need sign-off", () => {
    expect(closeBlockedReason({ ...base, from: "new", to: "closed" })).toBeNull();
    expect(
      closeBlockedReason({ ...base, requiresClientConfirmation: false, from: "resolved", to: "closed" })
    ).toBeNull();
  });
});
