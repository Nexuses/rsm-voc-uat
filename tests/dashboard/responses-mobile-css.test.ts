import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the mobile layout of the response ledger ("Client feedback detail").
 *
 * jsdom never applies a CSS module, so these assert the shape of the fixes.
 *
 * 1. `.sectionTitle` is a `space-between` flex row and `.topbarActions` is a
 *    `flex-shrink: 0` column. The phone rule `.topbarActions > *` sets
 *    `width: 100%`, so inside the section both children claimed the full row
 *    and the actions column was pushed ~98px past the card. The section clips
 *    overflow, which cut "Export CSV" / "Export Excel" in half.
 * 2. The filter row wrapped into ragged lines, and pagination stacked into four
 *    rows of mismatched widths.
 */
function rules(css: string) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: { selector: string; body: string }[] = [];
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    out.push({ selector: match[1].trim(), body: match[2] });
  }
  return out;
}

const CSS = readFileSync(
  path.join(process.cwd(), "components/dashboard/dashboard.module.css"),
  "utf8"
);
const all = rules(CSS);

function find(selector: string) {
  return all.filter((rule) => rule.selector.includes(selector));
}

describe("response ledger header on mobile", () => {
  it("stacks the section heading instead of overflowing the card", () => {
    const stacked = find(".responseSection .sectionTitle").filter((rule) =>
      /flex-direction\s*:\s*column/.test(rule.body)
    );

    expect(stacked.length).toBeGreaterThan(0);
  });

  it("lays the count and the two export buttons out as a grid", () => {
    const actions = find(".responseSection .topbarActions").filter((rule) =>
      /display\s*:\s*grid/.test(rule.body)
    );

    expect(actions.length).toBeGreaterThan(0);
  });
});

describe("response ledger filters on mobile", () => {
  it("uses a two-column grid so fields line up", () => {
    const filters = find(".responseSection .filters").filter((rule) =>
      /display\s*:\s*grid/.test(rule.body)
    );

    expect(filters.length).toBeGreaterThan(0);
  });

  it("spreads the CSAT mood buttons across the full width", () => {
    const mood = find(".responseSection .moodPicker").filter((rule) =>
      /grid-template-columns\s*:\s*repeat\(\s*4/.test(rule.body)
    );

    expect(mood.length).toBeGreaterThan(0);
  });
});

describe("response ledger pagination on mobile", () => {
  it("pairs the prev / page / next controls on one row", () => {
    const controls = find(".responseSection .tablePaginationControls").filter(
      (rule) =>
        /display\s*:\s*grid/.test(rule.body) &&
        /grid-template-columns\s*:\s*1fr\s+auto\s+1fr/.test(rule.body)
    );

    expect(controls.length).toBeGreaterThan(0);
  });
});
