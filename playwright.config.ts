import { defineConfig, devices } from "@playwright/test";

const port = 3000;
const baseURL = `http://127.0.0.1:${port}`;

/**
 * Screenshot baselines are OS-sensitive. Generate and update them on
 * Ubuntu/Chromium (CI or the Playwright Docker image), not macOS.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // Platform omitted so CI (linux) and local share one baseline set.
  // Regenerate on Ubuntu/Chromium (see .github/workflows/ci.yml).
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.08,
    },
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: "npm run build && npm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      PORT: String(port),
      NEXTAUTH_URL: baseURL,
      NEXTAUTH_SECRET:
        process.env.NEXTAUTH_SECRET ?? "playwright-e2e-nextauth-secret",
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://rsm_voc:rsm_voc@127.0.0.1:5432/rsm_voc?schema=public",
      ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ?? "test-el-key",
      ELEVENLABS_AGENT_ID: process.env.ELEVENLABS_AGENT_ID ?? "agent_test",
      ELEVENLABS_WEBHOOK_SECRET:
        process.env.ELEVENLABS_WEBHOOK_SECRET ?? "whsec_test",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "sk-test",
    },
  },
});
