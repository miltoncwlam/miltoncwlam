import { expect, test } from "@playwright/test";

test("landing and protected route redirect to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /notes become a deck/i }),
  ).toBeVisible();

  await page.goto("/decks");
  await expect(page).toHaveURL(/sign-in|accounts\.dev/i);
});

test("landing offers guest trial", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /try as guest/i })).toBeVisible();
});

test("sign-in page renders Clerk", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/sign-in|accounts\.dev/i);
});
