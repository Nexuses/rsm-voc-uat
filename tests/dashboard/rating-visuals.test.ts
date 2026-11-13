import { describe, expect, it } from "vitest";
import {
  bucketsToChartData,
  buildCesBuckets,
  buildCesRatingCards,
  buildCsatBuckets,
  buildNpsBuckets,
  cesReportScaleColor,
  cesScaleColor,
  cesScorePercent,
  cesToneForRating,
  csatReportScaleColor,
  csatScaleColor,
  METRIC_BAND_COLORS,
  METRIC_IDENTITY_COLORS,
  methodologyBucketColor,
  methodologyCellToneColor,
  methodologyScaleBarSegments,
  metricBand,
  metricReportScaleColor,
  metricScaleColor,
  npsReportScaleColor,
  npsScaleColor,
  toneColor,
} from "@/lib/rating-visuals";

describe("rating visuals", () => {
  it("keeps metric identity colors separate from the rating scale", () => {
    expect(METRIC_IDENTITY_COLORS.csat).toBe("#3f9c35");
    expect(METRIC_IDENTITY_COLORS.ces).toBe("#888b8d");
    expect(METRIC_IDENTITY_COLORS.nps).toBe("#009cde");
  });

  it("groups CSAT ratings into smiley buckets", () => {
    const buckets = buildCsatBuckets([1, 0, 1, 0, 2]);
    expect(buckets.map((bucket) => bucket.count)).toEqual([2, 0, 1, 1]);
  });

  it("groups NPS ratings into promoter, neutral, and detractor buckets", () => {
    const buckets = buildNpsBuckets(1, 0, 1);
    expect(buckets.map((bucket) => bucket.count)).toEqual([1, 0, 1]);
    expect(buckets[1]?.label).toBe("Neutral");
    expect(buckets[1]?.id).toBe("nps-neutral");
  });

  it("maps buckets and CES scores for charts", () => {
    const buckets = buildCsatBuckets([1, 0, 1, 0, 2]);
    const chartData = bucketsToChartData(buckets);
    expect(chartData[0]?.shortLabel).toBe("5");
    expect(chartData[0]?.count).toBe(2);
    expect(cesScorePercent(4.5, 1, 7)).toBeCloseTo(58.3, 1);
  });

  it("groups CES ratings into compact effort buckets", () => {
    const buckets = buildCesBuckets([1, 0, 1, 0, 0, 1, 0]);
    expect(buckets.map((bucket) => bucket.count)).toEqual([1, 0, 0, 2]);
  });

  it("builds CES cards with weighted totals", () => {
    const cards = buildCesRatingCards([0, 0, 1, 0, 0, 1, 0]);
    expect(cards.find((card) => card.rating === 6)?.weighted).toBe(6);
    expect(cesToneForRating(7)).toBe("very-positive");
    expect(cesToneForRating(3)).toBe("negative");
  });

  it("maps bucket tones to the RSM brand palette", () => {
    expect(toneColor("very-positive")).toBe("#3f9c35");
    expect(toneColor("positive")).toBe("#009cde");
    expect(toneColor("neutral")).toBe("#63666a");
    expect(toneColor("negative")).toBe("#888b8d");
    expect(toneColor("very-negative")).toBe("#888b8d");
  });

  it("maps each metric rating to the global red-to-green scale", () => {
    expect(csatScaleColor(1)).toBe("#e01e37");
    expect(csatScaleColor(5)).toBe("#378b2c");
    expect(cesScaleColor(1)).toBe("#e01e37");
    expect(cesScaleColor(7)).toBe("#378b2c");
    expect(npsScaleColor(0)).toBe("#c4127e");
    expect(npsScaleColor(10)).toBe("#378b2c");
    expect(metricScaleColor("nps", 6)).toBe("#a8d55f");
  });

  it("zones scores consistently for sliders and review cards", () => {
    expect([1, 2, 3, 4, 5].map((score) => metricBand("csat", score))).toEqual([
      "low",
      "low",
      "mid",
      "high",
      "high",
    ]);
    expect([1, 3, 4, 5, 7].map((score) => metricBand("ces", score))).toEqual([
      "low",
      "low",
      "mid",
      "high",
      "high",
    ]);
    expect([0, 6, 7, 8, 9, 10].map((score) => metricBand("nps", score))).toEqual([
      "low",
      "low",
      "mid",
      "mid",
      "high",
      "high",
    ]);
    expect(METRIC_BAND_COLORS.high).toBe("#3f9c35");
    expect(METRIC_BAND_COLORS.mid).toBe("#009cde");
    expect(METRIC_BAND_COLORS.low).toBe("#63666a");
  });

  it("maps report methodology bars to the RSM green-blue-gray palette", () => {
    expect(csatReportScaleColor(5)).toBe("#3f9c35");
    expect(csatReportScaleColor(4)).toBe("#65b05d");
    expect(csatReportScaleColor(3)).toBe("#009cde");
    expect(csatReportScaleColor(1)).toBe("#bdbdbd");
    expect(npsReportScaleColor(10)).toBe("#3f9c35");
    expect(npsReportScaleColor(7)).toBe("#009cde");
    expect(npsReportScaleColor(0)).toBe("#d5d5d5");
    expect(cesReportScaleColor(7)).toBe("#3f9c35");
    expect(cesReportScaleColor(5)).toBe("#65b05d");
    expect(cesReportScaleColor(4)).toBe("#009cde");
    expect(cesReportScaleColor(3)).toBe("#9e9e9e");
    expect(metricReportScaleColor("ces", 1)).toBe("#bdbdbd");
  });

  it("maps methodology bucket tones to green, blue, and gray", () => {
    expect(methodologyBucketColor("very-positive")).toBe("#3f9c35");
    expect(methodologyBucketColor("positive")).toBe("#65b05d");
    expect(methodologyBucketColor("neutral")).toBe("#009cde");
    expect(methodologyBucketColor("negative")).toBe("#9e9e9e");
    expect(methodologyCellToneColor("positive")).toBe("#3f9c35");
    expect(methodologyCellToneColor("neutral")).toBe("#009cde");
    expect(methodologyCellToneColor("negative")).toBe("#9e9e9e");
  });

  it("builds methodology scale bars from the green-blue-gray palette", () => {
    const cesBar = methodologyScaleBarSegments("ces");
    expect(cesBar.find((segment) => segment.rating === "5")?.color).toBe("#65b05d");
    expect(cesBar.find((segment) => segment.rating === "4")?.color).toBe("#009cde");
    expect(cesBar.find((segment) => segment.rating === "3")?.color).toBe("#9e9e9e");
    const npsBar = methodologyScaleBarSegments("nps");
    expect(npsBar.find((segment) => segment.rating === "8")?.color).toBe("#009cde");
    expect(npsBar.find((segment) => segment.rating === "6")?.color).toBe("#9e9e9e");
  });
});
