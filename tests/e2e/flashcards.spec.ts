import { expect, test, type Cookie } from "@playwright/test";

function betaCookie(cookies: Cookie[]) {
  return cookies.find((cookie) => cookie.name === "hkstudya-beta");
}

test("landing and protected route redirect to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Version 3.9.3").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /version 4\.0\.0 is now on beta/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/do not show again/i)).toBeVisible();
  await expect(page.getByText(/60% energy until 22 Sep 23:59 UTC/i).first()).toBeVisible();
  await page.getByRole("button", { name: /not now/i }).click();
  await expect(
    page.getByRole("heading", { name: "Stay in the notebook", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Version 3.9.3").first()).toBeVisible();
  expect(betaCookie(await page.context().cookies())).toBeUndefined();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: /version 4\.0\.0 is now on beta/i }),
  ).toBeVisible();
  expect(betaCookie(await page.context().cookies())).toBeUndefined();

  await page.goto("/decks");
  await expect(page).toHaveURL(/sign-in|accounts\.dev/i);
});

test("enter beta this visit without a cookie", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /enter version 4\.0\.0 beta/i }).click();
  await expect(page.getByText("Version 4.0.0 beta").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /beta feedback/i })).toBeVisible();
  expect(betaCookie(await page.context().cookies())).toBeUndefined();

  await page.reload();
  await expect(page.getByText("Version 4.0.0 beta").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /version 4\.0\.0 is now on beta/i }),
  ).toHaveCount(0);
  expect(betaCookie(await page.context().cookies())).toBeUndefined();
});

test("do not show again plus enter persists beta", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/do not show again/i).check();
  await page.getByRole("button", { name: /enter version 4\.0\.0 beta/i }).click();
  await expect(page.getByText("Version 4.0.0 beta").first()).toBeVisible();
  expect(betaCookie(await page.context().cookies())?.value).toBe("enter");
});

test("do not show again is the only cookie", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/do not show again/i).check();
  await page.getByRole("button", { name: /not now/i }).click();
  await expect(page.getByText("Version 3.9.3").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /version 4\.0\.0 is now on beta/i }),
  ).toHaveCount(0);
  expect(betaCookie(await page.context().cookies())?.value).toBe("hide");
});

test("landing offers guest trial", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /not now/i }).click();
  await expect(
    page.getByRole("button", { name: /try as guest|continue on localhost/i }),
  ).toBeVisible();
});

test("sign-in page renders Clerk", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/sign-in|accounts\.dev/i);
});
