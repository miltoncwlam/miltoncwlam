import { expect, test } from "@playwright/test";

test("landing and protected route redirect to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Version 3.9.3").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /version 4\.0\.0 is now on beta/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /not now/i }).click();
  await expect(
    page.getByRole("heading", { name: /stay in the notebook/i }),
  ).toBeVisible();
  await expect(page.getByText("Version 3.9.3").first()).toBeVisible();

  await page.goto("/decks");
  await expect(page).toHaveURL(/sign-in|accounts\.dev/i);
});

test("landing offers guest trial", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /not now/i }).click();
  await expect(page.getByRole("button", { name: /try as guest/i })).toBeVisible();
});

test("sign-in page renders Clerk", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/sign-in|accounts\.dev/i);
});
