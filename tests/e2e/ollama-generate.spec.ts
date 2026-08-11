import { expect, test } from "@playwright/test";

const email =
  process.env.E2E_USER_EMAIL || process.env.ADMIN_BOOTSTRAP_EMAIL || "";
const password =
  process.env.E2E_USER_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD || "";
const skip =
  process.env.E2E_OLLAMA !== "1" || !email || !password;

test.describe("Ollama text generate", () => {
  test.skip(skip, "Set E2E_OLLAMA=1 and auth env to run");

  test("creates a small deck from pasted text", async ({ page }) => {
    await page.goto("/sign-in");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/decks/, { timeout: 30_000 });

    await page.goto("/decks/new");
    await page.getByLabel(/material|notes|content/i).fill(
      "Photosynthesis converts light energy into chemical energy in plants. Chlorophyll absorbs light. The Calvin cycle fixes carbon dioxide into sugars. Mitochondria are not the primary site of photosynthesis.",
    );
    await page.locator('select[name="provider"]').selectOption("ollama");
    await page.locator('input[name="cardCount"]').fill("3");
    await page.getByRole("button", { name: /create|generate/i }).click();
    await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}/i, {
      timeout: 240_000,
    });
  });
});
