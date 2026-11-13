import { expect, type Page, test } from "@playwright/test";

async function openSurvey(page: Page) {
  await page.goto("/survey", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.fonts.ready.then(() => true));
  await expect(
    page.getByRole("heading", {
      name: "Choose how you would like to respond",
    })
  ).toBeVisible();
}

async function stabilizeForScreenshot(page: Page) {
  // Shared metrics so Mac baselines compare on Ubuntu CI without full-page
  // height drift from font wrapping.
  await page.addStyleTag({
    content: `
      @font-face {
        font-family: Prelo;
        src: local("Arial");
      }
      html, body, button, input, textarea, select, p, span, strong, small, h1, h2, h3, label, a {
        font-family: Arial, Helvetica, sans-serif !important;
        letter-spacing: 0 !important;
        word-spacing: 0 !important;
      }
      html, body {
        line-height: 1.4 !important;
      }
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.evaluate(() => document.fonts.ready);
}

async function expectSurveyScreenshot(page: Page, name: string) {
  await stabilizeForScreenshot(page);
  // Viewport-only (not fullPage) keeps a fixed 1280x720 canvas across OS
  // font metrics; full-page height otherwise drifts (e.g. Arabic on Ubuntu).
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: false,
    animations: "disabled",
  });
}

test.describe("survey visual baselines", () => {
  test("mode chooser English", async ({ page }) => {
    await openSurvey(page);
    await expectSurveyScreenshot(page, "survey-mode-chooser-en");
  });

  test("mode chooser Arabic", async ({ page }) => {
    await openSurvey(page);
    await page.getByRole("button", { name: "العربية", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "اختر طريقة المشاركة" })
    ).toBeVisible();
    await expect(page.locator('[dir="rtl"]').first()).toHaveAttribute(
      "dir",
      "rtl"
    );
    await expectSurveyScreenshot(page, "survey-mode-chooser-ar");
  });

  test("voice host picker", async ({ page }) => {
    await openSurvey(page);
    await page.getByRole("button", { name: /Take voice survey/i }).click();
    await expect(
      page.getByRole("heading", { name: "Choose your voice host" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Talk with our English survey host/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Talk with our Arabic survey host/i })).toBeVisible();
    await expectSurveyScreenshot(page, "survey-voice-host-picker");
  });

  test("typed survey start English", async ({ page }) => {
    await openSurvey(page);
    await page.getByRole("button", { name: /Take typed survey/i }).click();
    await expect(
      page.getByRole("heading", { name: "Typed survey" })
    ).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expectSurveyScreenshot(page, "survey-typed-start-en");
  });
});

test.describe("survey interactions", () => {
  test("language switcher toggles Arabic RTL and back", async ({ page }) => {
    await openSurvey(page);

    const arabic = page.getByRole("button", { name: "العربية", exact: true });
    const english = page.getByRole("button", { name: "English", exact: true });

    await expect(english).toHaveAttribute("aria-pressed", "true");
    await arabic.click();
    await expect(arabic).toHaveAttribute("aria-pressed", "true");
    await expect(english).toHaveAttribute("aria-pressed", "false");
    await expect(
      page.getByRole("heading", { name: "اختر طريقة المشاركة" })
    ).toBeVisible();
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible();

    await english.click();
    await expect(english).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("heading", {
        name: "Choose how you would like to respond",
      })
    ).toBeVisible();
  });

  test("voice path shows host picker and back returns to mode chooser", async ({
    page,
  }) => {
    await openSurvey(page);
    await page.getByRole("button", { name: /Take voice survey/i }).click();

    await expect(
      page.getByRole("heading", { name: "Choose your voice host" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Talk with our English survey host/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Talk with our Arabic survey host/i })
    ).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Choose how you would like to respond",
      })
    ).toBeVisible();
  });

  test("typed path validates empty identity and advances after fill", async ({
    page,
  }) => {
    await openSurvey(page);
    await page.getByRole("button", { name: /Take typed survey/i }).click();

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Full name is required.")).toBeVisible();
    await expect(page.getByText("Company name is required.")).toBeVisible();
    await expect(page.getByText("Designation is required.")).toBeVisible();

    await page.getByLabel("Full name").fill("Alex Client");
    await page.getByLabel("Business or company name").fill("Example Co");
    await page.getByLabel("Designation").fill("Finance Director");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Step 2 of 5")).toBeVisible();
    await expect(page.getByText("CSAT", { exact: true })).toBeVisible();
  });
});
