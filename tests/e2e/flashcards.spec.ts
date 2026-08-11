import { expect, test } from "@playwright/test";

const e2eEmail =
  process.env.E2E_USER_EMAIL || process.env.ADMIN_BOOTSTRAP_EMAIL || "";
const e2ePassword =
  process.env.E2E_USER_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD || "";
const skipAuth =
  process.env.E2E_SKIP_AUTH === "1" || !e2eEmail || !e2ePassword;

test("landing and protected route redirect to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /notes become a deck/i }),
  ).toBeVisible();

  await page.goto("/decks");
  await expect(page).toHaveURL(/sign-in/i);
});

test("sign-in page renders Better Auth form", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: /passkey/i })).toBeVisible();
});

test.describe("Better Auth authenticated flows", () => {
  test.skip(skipAuth, "Set E2E_USER_EMAIL/PASSWORD or ADMIN_BOOTSTRAP_*");

  test("sample deck → study → share", async ({ page }) => {
    await page.goto("/sign-in");
    await page.locator('input[type="email"]').fill(e2eEmail);
    await page.locator('input[type="password"]').fill(e2ePassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/decks/, { timeout: 30_000 });

    await page.goto("/decks/new");
    await page.getByRole("button", { name: /sample/i }).click();
    await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}/i, {
      timeout: 30_000,
    });

    const study = page.getByRole("link", { name: /study/i }).first();
    await expect(study).toBeVisible();
    await study.click();
    await expect(page).toHaveURL(/\/study/);
    await expect(page.getByText(/card|flip|hard|easy/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.goto(page.url().replace(/\/study.*/, ""));
    const enableShare = page.getByRole("button", {
      name: /enable.*link|rotate link/i,
    });
    if (await enableShare.isVisible().catch(() => false)) {
      await enableShare.click();
      await expect(page.getByText(/share|copied|unlisted|iframe/i).first()).toBeVisible({
        timeout: 10_000,
      });
    }

    const quiz = page.getByRole("link", { name: /quiz/i }).first();
    if (await quiz.isVisible().catch(() => false)) {
      await quiz.click();
      await expect(page).toHaveURL(/\/quiz/);
    }
  });
});
