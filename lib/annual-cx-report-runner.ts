import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename, relative } from "node:path";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import type { AnnualCxReportDataJson } from "@/lib/annual-cx-report-payload";

export type CxReportKind = "annual" | "cx" | "partner" | "csat" | "nps" | "ces";

export class AnnualCxReportBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnnualCxReportBuildError";
  }
}

export function resolveCxReportRoot() {
  const fromEnv = process.env.CX_REPORT_ROOT?.trim();
  if (fromEnv) return fromEnv;
  return join(process.cwd(), "pdf-files", "cx_report");
}

/**
 * CSAT/NPS/CES one-page plates share the unified pdf-files/cx_report tree
 * (single_reports.py + layouts/v3_*.json). Override with CX_METRIC_REPORT_ROOT if needed.
 */
export function resolveMetricCxReportRoot() {
  const fromEnv = process.env.CX_METRIC_REPORT_ROOT?.trim();
  if (fromEnv) return fromEnv;
  return resolveCxReportRoot();
}

export function resolveCxReportPython(root: string) {
  const fromEnv = process.env.CX_REPORT_PYTHON?.trim();
  if (fromEnv) return fromEnv;
  const venvUnix = join(root, ".venv", "bin", "python");
  const venvWin = join(root, ".venv", "Scripts", "python.exe");
  if (existsSync(venvUnix)) return venvUnix;
  if (existsSync(venvWin)) return venvWin;
  return null;
}

function resolvePythonForRoot(root: string) {
  const direct = resolveCxReportPython(root);
  if (direct) return direct;
  // Reuse the annual report venv when the metric tree has no .venv yet.
  if (root !== resolveCxReportRoot()) {
    return resolveCxReportPython(resolveCxReportRoot());
  }
  return null;
}

const SETUP_HINT =
  "CX PDF needs the Playwright Python env. On the app host run: ./scripts/setup-cx-report.sh";

/**
 * Turns a captured stderr/stdout blob into one short, user-facing sentence.
 *
 * A Python traceback starts with `Traceback (most recent call last):` followed
 * by absolute paths to the server's source files, and only the *last* line
 * carries the exception and its message. Slicing the head — as this used to do
 * — showed the operator a wall of `/Users/...` paths, leaked the host layout
 * into the browser, and hid the actual cause. Take the final exception line
 * instead and strip filesystem paths from it.
 */
function lastErrorLine(detail: string): string {
  const lines = detail
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Prefer the trailing `SomeError: message` line of the traceback.
  const exceptionLine = [...lines]
    .reverse()
    .find((line) => /^[A-Za-z_][\w.]*(Error|Exception|Exit)\b\s*:?/.test(line));

  const line = exceptionLine ?? lines[lines.length - 1] ?? "";

  return line
    // Absolute POSIX paths and Windows paths never belong in a UI message.
    .replace(/(?:\/[\w.@+-]+){2,}\/?/g, "")
    .replace(/[A-Za-z]:\\[^\s"']+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 180);
}

function humanizeBuildFailure(detail: string): string {
  const lower = detail.toLowerCase();
  if (
    lower.includes("no module named 'playwright'") ||
    lower.includes("no module named \"playwright\"") ||
    lower.includes("no module named 'jinja2'")
  ) {
    return SETUP_HINT;
  }
  if (
    (lower.includes("executable doesn't exist") && lower.includes("chromium")) ||
    lower.includes("browsertype.launch") ||
    lower.includes("chromium.launch") ||
    lower.includes("host system is missing dependencies") ||
    lower.includes("error while loading shared libraries")
  ) {
    return `${SETUP_HINT} Then: pdf-files/cx_report/.venv/bin/playwright install --with-deps chromium`;
  }
  const line = lastErrorLine(detail);
  return line ? `CX PDF build failed: ${line}` : "CX PDF build failed.";
}

/** Repo-relative path for error text, so host directories are not exposed. */
function displayPath(target: string) {
  const repoRelative = relative(process.cwd(), target);
  return repoRelative.startsWith("..") ? basename(target) : repoRelative;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(
        new AnnualCxReportBuildError(
          `CX PDF build timed out after ${Math.round(timeoutMs / 1000)}s.`
        )
      );
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

/**
 * Runs the Playwright CX report builder.
 * - annual → pdf-files/cx_report (full deck)
 * - cx → same tree `--type=cx` (4-page custom-period, no YoY)
 * - csat|nps|ces → same tree `--type=` one-pagers
 */
export async function renderCxReportPdfBuffer(
  data: AnnualCxReportDataJson | Record<string, unknown>,
  kind: CxReportKind = "annual"
): Promise<Buffer> {
  const root =
    kind === "csat" || kind === "nps" || kind === "ces"
      ? resolveMetricCxReportRoot()
      : resolveCxReportRoot();
  const script = join(root, "build_report.py");
  if (!existsSync(script)) {
    throw new AnnualCxReportBuildError(
      `CX report template missing at ${displayPath(script)}.`
    );
  }
  if (kind === "csat" || kind === "nps" || kind === "ces") {
    const singleReports = join(root, "single_reports.py");
    if (!existsSync(singleReports)) {
      throw new AnnualCxReportBuildError(
        `Single-metric report module missing under ${displayPath(root)} (expected single_reports.py).`
      );
    }
  }
  if (kind === "cx") {
    const cxTemplate = join(root, "templates", "cx.html.j2");
    if (!existsSync(cxTemplate)) {
      throw new AnnualCxReportBuildError(
        `Custom-period CX template missing at ${displayPath(cxTemplate)}.`
      );
    }
  }
  if (kind === "partner") {
    const partnerModule = join(root, "partner_report.py");
    if (!existsSync(partnerModule)) {
      throw new AnnualCxReportBuildError(
        `Partner report module missing under ${displayPath(root)} (expected partner_report.py).`
      );
    }
  }

  const python = resolvePythonForRoot(root);
  if (!python) {
    throw new AnnualCxReportBuildError(SETUP_HINT);
  }

  const workDir = await mkdtemp(join(tmpdir(), `rsm-cx-${kind}-`));
  const dataPath = join(workDir, "report_data.json");
  const outPath = join(workDir, "report.pdf");

  try {
    await writeFile(dataPath, JSON.stringify(data, null, 2), "utf8");
    const timeoutMs = Number(process.env.CX_REPORT_TIMEOUT_MS ?? 120_000);
    const args =
      kind === "annual"
        ? [script, dataPath, outPath]
        : [script, `--type=${kind}`, dataPath, outPath];
    const result = await runCommand(
      python,
      args,
      root,
      Number.isFinite(timeoutMs) ? Math.max(30_000, timeoutMs) : 120_000
    );

    if (result.code !== 0) {
      const detail = (result.stderr || result.stdout || "").trim();
      throw new AnnualCxReportBuildError(humanizeBuildFailure(detail));
    }

    if (!existsSync(outPath)) {
      throw new AnnualCxReportBuildError(
        "CX PDF build finished without an output file."
      );
    }

    return await readFile(outPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** @deprecated Prefer renderCxReportPdfBuffer(data, "annual") */
export async function renderAnnualCxReportPdfBuffer(
  data: AnnualCxReportDataJson
): Promise<Buffer> {
  return renderCxReportPdfBuffer(data, "annual");
}
