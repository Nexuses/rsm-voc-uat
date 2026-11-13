import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the mobile layout of the report surfaces.
 *
 * jsdom never applies a CSS module, so neither defect is visible to a rendered
 * component test — these assertions pin the shape of the fixes instead.
 *
 * 1. The metric report header (CSAT / CES / NPS) is a wrapping desktop flex row:
 *    title left, PDF action right. On a phone the title claimed the first row,
 *    so the PDF block wrapped underneath while keeping `max-width: 280px` and
 *    `justify-items: end`. The button floated right, its hint text started back
 *    at the left edge, and the title's `white-space: nowrap` pushed the long
 *    CSAT title past the viewport at 320px.
 * 2. The public report's six-month trend needs ~550px of bars inside a 218-398px
 *    phone panel, and `.report` clips the overflow, so the last months were
 *    simply unreachable.
 */
function rules(css: string) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: { selector: string; body: string }[] = [];
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    out.push({ selector: match[1].trim(), body: match[2] });
  }
  return out;
}

const dashboardCss = readFileSync(
  path.join(process.cwd(), "components/dashboard/dashboard.module.css"),
  "utf8"
);
const reportsCss = readFileSync(
  path.join(process.cwd(), "components/reports/reports.module.css"),
  "utf8"
);

/** Every rule whose selector mentions `needle`, in file order. */
function matching(css: string, needle: string) {
  return rules(css).filter((rule) => rule.selector.includes(needle));
}

describe("metric report header on mobile", () => {
  it("stacks the header instead of wrapping the desktop row", () => {
    const stacked = matching(dashboardCss, ".metricReportHeaderMain").filter(
      (rule) => /flex-direction\s*:\s*column/.test(rule.body)
    );

    expect(stacked.length).toBeGreaterThan(0);
  });

  it("lets the report title wrap instead of overflowing", () => {
    const titles = matching(dashboardCss, ".metricReportPageTitle").filter(
      (rule) => /white-space\s*:\s*normal/.test(rule.body)
    );

    expect(titles.length).toBeGreaterThan(0);
  });

  it("gives the download action the full width on phones", () => {
    const actions = matching(dashboardCss, ".metricReportPdfActions").filter(
      (rule) => /max-width\s*:\s*none/.test(rule.body)
    );

    expect(actions.length).toBeGreaterThan(0);
  });

  it("centres the hint under the stacked button", () => {
    const hints = matching(dashboardCss, ".metricReportPdfHint").filter(
      (rule) => /text-align\s*:\s*center/.test(rule.body)
    );

    expect(hints.length).toBeGreaterThan(0);
  });
});

describe("public report trend on mobile", () => {
  it("scrolls the trend strip rather than clipping the later months", () => {
    const scrolling = matching(reportsCss, ".trendChart").filter((rule) =>
      /overflow-x\s*:\s*auto/.test(rule.body)
    );

    expect(scrolling.length).toBeGreaterThan(0);
  });

  it("keeps every month at its natural width inside the scroller", () => {
    const months = matching(reportsCss, ".trendMonths").filter((rule) =>
      /min-width\s*:\s*max-content/.test(rule.body)
    );

    expect(months.length).toBeGreaterThan(0);
  });
});
