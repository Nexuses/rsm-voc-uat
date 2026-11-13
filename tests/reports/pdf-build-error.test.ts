import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderCxReportPdfBuffer } from "@/lib/annual-cx-report-runner";

/**
 * Guards the message shown when the Playwright CX builder fails.
 *
 * The builder is a Python process, so a failure arrives as a full traceback:
 * `Traceback (most recent call last):` followed by absolute source paths, with
 * the actual exception on the last line. The dashboard used to slice the first
 * 280 characters of that blob, so the user saw a wall of
 * `/Users/.../main-pdf-files/cx_report/build_report.py` instead of the cause —
 * and the raw host paths leaked into the browser. It also rendered that string
 * as one unbroken line, which is what broke the page layout.
 *
 * A stub `.venv/bin/python` stands in for the real interpreter so no Python or
 * Playwright is needed here.
 */
const TRACEBACK = [
  "Traceback (most recent call last):",
  '  File "/Users/someone/Documents/Nexuses/rsm/rsm-voc-survey-new-main/main-pdf-files/cx_report/build_report.py", line 480, in <module>',
  "    main()",
  '  File "/Users/someone/Documents/Nexuses/rsm/rsm-voc-survey-new-main/main-pdf-files/cx_report/build_report.py", line 438, in main_cx',
  "    m, warns = metrics(d)",
  '  File "/Users/someone/Documents/Nexuses/rsm/rsm-voc-survey-new-main/main-pdf-files/cx_report/build_report.py", line 51, in metrics',
  "    cc['score'] = rnd1(cc['sum'] / cc['total'])",
  "ZeroDivisionError: division by zero",
  "",
].join("\n");

let root: string;
const previousRoot = process.env.CX_REPORT_ROOT;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "cx-report-fail-"));
  mkdirSync(join(root, "templates"), { recursive: true });
  mkdirSync(join(root, ".venv", "bin"), { recursive: true });
  writeFileSync(join(root, "build_report.py"), "# stub\n");
  writeFileSync(join(root, "templates", "cx.html.j2"), "<html></html>");

  const python = join(root, ".venv", "bin", "python");
  // Emit the traceback on stderr and fail, exactly like the real builder.
  writeFileSync(
    python,
    `#!/bin/sh\ncat >&2 <<'TRACE'\n${TRACEBACK}TRACE\nexit 1\n`
  );
  chmodSync(python, 0o755);

  process.env.CX_REPORT_ROOT = root;
});

afterAll(() => {
  if (previousRoot === undefined) delete process.env.CX_REPORT_ROOT;
  else process.env.CX_REPORT_ROOT = previousRoot;
  rmSync(root, { recursive: true, force: true });
});

describe("CX PDF build failures", () => {
  it("surfaces the exception, not the traceback head", async () => {
    await expect(renderCxReportPdfBuffer({}, "cx")).rejects.toThrow(
      /ZeroDivisionError: division by zero/
    );
  });

  it("does not leak host filesystem paths to the client", async () => {
    const message = await renderCxReportPdfBuffer({}, "cx").catch(
      (error: Error) => error.message
    );

    expect(message).not.toContain("/Users/");
    expect(message).not.toContain("build_report.py\", line");
  });

  it("keeps the message short enough to render in a header", async () => {
    const message = await renderCxReportPdfBuffer({}, "cx").catch(
      (error: Error) => error.message
    );

    expect(message.length).toBeLessThanOrEqual(220);
  });
});
