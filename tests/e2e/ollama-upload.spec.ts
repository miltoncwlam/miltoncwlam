import path from "node:path";

import { expect, test } from "@playwright/test";

const email =
  process.env.E2E_USER_EMAIL || process.env.ADMIN_BOOTSTRAP_EMAIL || "";
const password =
  process.env.E2E_USER_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD || "";
const skip = process.env.E2E_OLLAMA !== "1" || !email || !password;

const fixturesDir = path.join(__dirname, "../fixtures");

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.locator('input.field[type="email"]').fill(email);
  await page.locator('input.field[type="password"]').fill(password);
  await page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: /passkey/i }) })
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(page).toHaveURL(/\/decks/, { timeout: 30_000 });
}

async function generateFromPdf(
  page: import("@playwright/test").Page,
  filePath: string,
  screenshotName: string,
) {
  await page.goto("/decks/new");
  await page.getByRole("button", { name: "file", exact: true }).click();
  await page.locator('select[name="ollamaModel"]').selectOption("gemma4:e2b");
  await page.locator('input[name="cardCount"]').fill("4");
  await page.locator('input[name="sourceFile"]').setInputFiles(filePath);
  await page.getByRole("button", { name: /generate/i }).click();
  const failed = page.locator(
    "text=/Generation failed|upload secret|Could not read|timed out/i",
  );
  await expect
    .poll(
      async () => {
        if (await failed.isVisible().catch(() => false)) {
          throw new Error((await failed.textContent()) ?? "Generation failed");
        }
        return /\/decks\/[0-9a-f-]{36}/i.test(page.url());
      },
      { timeout: 240_000 },
    )
    .toBe(true);
  await expect(page.getByText(/complete/i)).toBeVisible({ timeout: 10_000 });
  await page.screenshot({
    path: path.join(fixturesDir, screenshotName),
    fullPage: true,
  });
}

test.describe("Ollama PDF generate", () => {
  test.skip(skip, "Set E2E_OLLAMA=1 and auth env to run");

  test.setTimeout(300_000);

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("creates a deck from a PDF file", async ({ page }) => {
    await generateFromPdf(
      page,
      path.join(fixturesDir, "photosynthesis-notes.pdf"),
      "screenshot-pdf-success.png",
    );
  });
});
