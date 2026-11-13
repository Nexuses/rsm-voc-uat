import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the "chosen band stays lit" rule in the static rating scale.
 *
 * jsdom never applies the CSS module, so a rendered component reports no
 * computed opacity and a unit test cannot see cascade bugs. The original defect
 * was exactly that: `.ratingScale[data-rated="true"] .ratingScaleRegion`
 * (specificity 0,3,0) quietly outranked the `[data-active="true"]` restore rule
 * (0,2,0), so picking a score faded *every* band, including the chosen one's
 * face and label. The fix makes the dim rule exclude the active band with
 * `:not()`, which no restore rule can lose to. This test asserts that shape.
 */
const CSS = readFileSync(
  path.join(process.cwd(), "components/survey/survey.module.css"),
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

describe("rating scale band dimming", () => {
  const dimming = rules(CSS).filter(
    (rule) =>
      rule.selector.includes(".ratingScale") &&
      rule.selector.includes('[data-rated="true"]') &&
      /(^|;)\s*opacity\s*:/.test(rule.body)
  );

  it("dims the unselected bands once a score is chosen", () => {
    expect(dimming.length).toBeGreaterThan(0);
  });

  it("never dims the selected band's face and label", () => {
    for (const rule of dimming) {
      expect(rule.selector).toContain(':not([data-active="true"])');
    }
  });
});
