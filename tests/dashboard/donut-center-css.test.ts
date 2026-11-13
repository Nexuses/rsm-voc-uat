import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the donut centre label against drifting off the ring.
 *
 * The centre overlay is a grid with `place-content: center`. That centres the
 * grid's content *box*, but the default `justify-items: stretch` still makes
 * every row as wide as the widest row — the label, not the figure. With the
 * default `text-align: start` the score then left-aligned inside that width, so
 * "31" rendered left of the ring while "NPS score" looked centred. Measured on
 * the real component: the score's box was 47px wide (the label's width) with
 * its glyphs starting at the box's left edge.
 *
 * jsdom never applies a CSS module, so this can only be checked in the
 * stylesheet: each donut-centre class must centre its items, not just its
 * content box.
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

const CENTRE_CLASSES = [
  ".panelDonutCenter",
  ".kpiDonutCenter",
  ".shareDonutCenter",
  ".methodDonutCenter",
];

describe("donut centre label", () => {
  const all = rules(CSS);

  for (const className of CENTRE_CLASSES) {
    it(`centres the items inside ${className}`, () => {
      const rule = all.find((entry) =>
        entry.selector.split(",").some((part) => part.trim() === className)
      );

      expect(rule).toBeDefined();
      // Centring the content box alone leaves the rows stretched to the widest
      // row, which is what pushed the figure off-centre.
      expect(rule!.body).toMatch(/justify-items\s*:\s*center/);
      expect(rule!.body).toMatch(/text-align\s*:\s*center/);
    });
  }
});
