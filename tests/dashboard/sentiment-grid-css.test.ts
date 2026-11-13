import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the Sentiment and risk stat grid against the two cascade bugs that
 * overflowed it on phones.
 *
 * jsdom never applies a CSS module, so neither defect is visible to a rendered
 * component test:
 *
 * 1. `.sentimentStats div` (specificity 0,1,1) also matched the stat badge and
 *    the copy block, outranking `.sentimentStatCopy`'s `display: grid` (0,1,0).
 *    The score and its label were laid out as a flex row instead of stacked,
 *    which made each tile far wider than its column.
 * 2. `repeat(2, 1fr)` keeps a min-content floor (it resolves to
 *    `minmax(auto, 1fr)`), so the oversized tiles could not shrink and the
 *    second column rendered past the card's right edge at 320-390px.
 *
 * This test asserts the shape of both fixes: a direct-child selector for the
 * tile chrome and a zero minimum on the columns.
 */
const CSS = readFileSync(
  path.join(process.cwd(), "components/dashboard/dashboard.module.css"),
  "utf8"
);

type Rule = { selector: string; body: string };

function rules(css: string): Rule[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Rule[] = [];
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    out.push({ selector: match[1].trim(), body: match[2] });
  }
  return out;
}

describe("sentiment stat grid", () => {
  const all = rules(CSS);

  it("styles the stat tiles with a direct-child selector", () => {
    const tileRules = all.filter((rule) =>
      rule.selector.split(",").some((part) => {
        const selector = part.trim();
        return (
          selector.startsWith(".sentimentStats") &&
          /(^|[\s>])div$/.test(selector) &&
          /display\s*:/.test(rule.body)
        );
      })
    );

    expect(tileRules.length).toBeGreaterThan(0);
    for (const rule of tileRules) {
      expect(rule.selector).toContain(".sentimentStats > div");
      expect(rule.selector).not.toMatch(/\.sentimentStats\s+div/);
    }
  });

  it("lets the two columns shrink below their content width", () => {
    const grid = all.find((rule) => rule.selector === ".sentimentStats");

    expect(grid).toBeDefined();
    expect(grid!.body).toMatch(
      /grid-template-columns\s*:\s*repeat\(\s*2\s*,\s*minmax\(\s*0\s*,/
    );
  });
});
