import { describe, expect, it } from "vitest";
import {
  compareBenchmarks,
  computeInternalBenchmarks,
  metricValue,
  quarterRange,
} from "@/lib/benchmarks/compute";
import { externalBenchmarkImportSchema } from "@/lib/benchmarks/service";
import { feedbackSignals, serviceLineCoverageGaps } from "@/lib/growth/opportunities";

describe("benchmarks", () => {
  it("computes UTC quarter boundaries", () => {
    const q = quarterRange(new Date("2026-08-15T10:00:00Z"));
    expect(q.label).toBe("2026-Q3");
    expect(q.start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(q.end.toISOString()).toBe("2026-09-30T23:59:59.999Z");
  });

  it("uses the dashboard metric definitions", () => {
    expect(metricValue("csat", [5, 4, 2, 1])).toBe(50);
    expect(metricValue("ces", [7, 5, 1, 1])).toBe(50);
    expect(metricValue("nps", [10, 9, 8, 0])).toBe(25);
    expect(metricValue("nps", [])).toBeNull();
  });

  it("groups by quarter, overall and service line", () => {
    const rows = computeInternalBenchmarks([
      { submittedAt: new Date("2026-07-02Z"), serviceLineCode: "audit", csat: 5, ces: null, nps: 10 },
      { submittedAt: new Date("2026-08-02Z"), serviceLineCode: null, csat: 1, ces: null, nps: 0 },
      { submittedAt: new Date("2026-04-02Z"), serviceLineCode: "tax", csat: 4, ces: null, nps: null },
    ]);
    const q3Overall = rows.filter((r) => r.dimension === "overall" && r.periodStart.getUTCMonth() === 6);
    expect(q3Overall).toEqual([
      expect.objectContaining({ metric: "csat", value: 50, sampleSize: 2 }),
      expect.objectContaining({ metric: "nps", value: 0, sampleSize: 2 }),
    ]);
    expect(rows.find((r) => r.dimensionKey === "audit" && r.metric === "csat")).toMatchObject({ value: 100, sampleSize: 1 });
    expect(rows.some((r) => r.metric === "ces")).toBe(false);
  });

  it("never merges internal and external figures", () => {
    const base = { dimension: "overall", dimensionKey: "", sampleSize: null, population: null, periodStart: new Date(), periodEnd: new Date() };
    const result = compareBenchmarks([
      { ...base, scope: "internal", metric: "nps", value: 40, source: "internal:voc-responses" },
      { ...base, scope: "external", metric: "nps", value: 30, source: "Industry study" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].internal.map((r) => r.value)).toEqual([40]);
    expect(result[0].external.map((r) => r.value)).toEqual([30]);
  });

  it("requires a source and a valid period for external imports", () => {
    const row = { dimension: "industry", metric: "nps", value: 30, source: "Industry study", periodStart: "2026-01-01", periodEnd: "2026-03-31" };
    expect(externalBenchmarkImportSchema.safeParse({ rows: [row] }).success).toBe(true);
    expect(externalBenchmarkImportSchema.safeParse({ rows: [{ ...row, source: "" }] }).success).toBe(false);
    expect(externalBenchmarkImportSchema.safeParse({ rows: [{ ...row, periodEnd: "2025-12-31" }] }).success).toBe(false);
  });
});

describe("cross-sell coverage", () => {
  it("lists service lines without an engagement and factual feedback signals", () => {
    const lines = [
      { id: "sl-1", code: "audit", name: "Audit" },
      { id: "sl-2", code: "tax", name: "Tax" },
    ];
    expect(serviceLineCoverageGaps({ allServiceLines: lines, engagedServiceLineIds: ["sl-1"] })).toEqual({
      covered: [lines[0]],
      gaps: [lines[1]],
    });
    expect(feedbackSignals([{ csatScore: 5, npsScore: 10 }, { csatScore: 2, npsScore: 6 }])).toEqual({
      responseCount: 2,
      csatFavorablePercent: 50,
      npsScore: 0,
      promoterCount: 1,
    });
  });
});
