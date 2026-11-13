import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the PDF download error block in the dashboard header.
 *
 * A failed build used to put a raw Python traceback in `.downloadReportError`.
 * The rule set only a colour, font size and `text-align: right`, so the
 * unbroken `/Users/.../build_report.py` string had nothing to wrap at. It
 * forced the header's `auto` actions column to grow past the viewport, crushed
 * the "CX Intelligence" title to a sliver, and spilled across the page — the
 * layout break reported alongside the failed download.
 *
 * jsdom never applies a CSS module, so these assertions pin the rule shape.
 */
const CSS = readFileSync(
  path.join(process.cwd(), "components/dashboard/dashboard.module.css"),
  "utf8"
);

function rules(css: string) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: { selector: string; body: string }[] = [];
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    out.push({ selector: match[1].trim(), body: match[2] });
  }
  return out;
}

const all = rules(CSS);

function rule(selector: string) {
  // First exact match: the base rule. Media-query overrides come later.
  return all.find((entry) => entry.selector === selector);
}

describe("PDF download error block", () => {
  it("wraps long server messages instead of overflowing", () => {
    const error = rule(".downloadReportError");

    expect(error).toBeDefined();
    expect(error!.body).toMatch(/overflow-wrap\s*:\s*anywhere/);
    expect(error!.body).toMatch(/white-space\s*:\s*normal/);
  });

  it("caps the message so it cannot set the header column width", () => {
    const error = rule(".downloadReportError");

    expect(error!.body).toMatch(/max-width\s*:\s*22rem/);
    expect(error!.body).toMatch(/max-height\s*:/);
    expect(error!.body).toMatch(/overflow\s*:\s*auto/);
  });

  it("lets the header actions column shrink", () => {
    const lead = rule(".overviewLead");
    const actions = rule(".overviewLeadActions");

    expect(lead!.body).toMatch(/grid-template-columns\s*:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*auto\)/);
    expect(actions!.body).toMatch(/min-width\s*:\s*0/);
  });

  it("gives the message the full card width on phones", () => {
    const mobile = all.filter(
      (entry) =>
        entry.selector === ".downloadReportError" &&
        /max-width\s*:\s*100%/.test(entry.body)
    );

    expect(mobile.length).toBeGreaterThan(0);
  });
});
