import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 503 }));
});

test.describe("homepage without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shows a semantic headline and keeps the guest entry usable", async ({
    page,
  }) => {
    await page.goto("/");

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveCount(1);
    await expect(heading).toHaveAccessibleName(/find your\s+sensitivity/i);
    await expect(heading).toBeVisible();

    const start = page.getByRole("link", { name: /^start training$/i }).first();
    await expect(start).toHaveAttribute("href", "#guest-play");
    await start.click();
    await expect(page).toHaveURL(/#guest-play$/);
    await expect(page.locator(":target")).toContainText("Play as guest");
  });
});

test("the desktop aim trace responds to the pointer without pinning the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const stage = page.getByTestId("hero-stage");
  await expect(stage.locator("canvas")).toHaveAttribute("data-ready", "true");
  await expect(stage).toHaveCSS("position", "relative");

  const canvas = stage.locator("canvas");
  const initial = await canvas.evaluate((element) => element.toDataURL());
  await stage.hover({ position: { x: 700, y: 280 } });
  await expect
    .poll(() => canvas.evaluate((element) => element.toDataURL()))
    .not.toBe(initial);
  await page.getByRole("link", { name: /^start training$/i }).click();
  await expect(page.locator(":target")).toHaveAttribute("id", "guest-play");
  await expect(stage).not.toBeInViewport({ ratio: 0.5 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(stage).toBeInViewport();
  expect(await canvas.evaluate((element) => element.toDataURL())).toBe(initial);

  const drill = page.getByRole("combobox", { name: "Leaderboard drill" });
  await drill.selectOption({ label: "Precision Six" });
  await expect(
    page.getByRole("heading", { name: "Top scores · Precision Six" }),
  ).toBeVisible();
});

test("reduced motion keeps the hero static on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.getByText("Move to aim")).not.toBeVisible();

  const hero = page.getByRole("heading", { level: 1 });
  await expect(hero).toBeVisible();
  await page.locator("#training").evaluate((chapter) => {
    chapter.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await expect(page.locator("#training")).toBeInViewport();
  await expect(hero).not.toBeInViewport({ ratio: 0.5 });
});

test("compact viewport keeps navigation usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByLabel("Menu", { exact: true }).click();
  const menu = page.getByRole("navigation", { name: "Mobile navigation" });
  for (const label of [
    "Train",
    "Calibrate",
    "Converter",
    "Leaderboards",
    "Log in",
  ]) {
    await expect(menu.getByRole("link", { name: label })).toBeVisible();
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Play as guest" })
    .click();
  await expect(page.locator(":target")).toContainText("Play as guest");
});

test("public routes use the same navigation and page background", async ({
  page,
}) => {
  await page.goto("/");
  const frame = page.locator(".site-frame");
  const background = await frame.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(background).toMatch(/^oklch\(0\.2 /);

  for (const path of [
    "/tools/converter",
    "/tools/calibrate",
    "/tools/mouse-swap",
    "/leaderboards",
    "/guides",
    "/privacy",
    "/terms",
    "/login",
    "/register",
    "/forgot-password",
  ]) {
    await page.goto(path);
    await expect(frame).toHaveCSS("background-color", background);
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Footer navigation" }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  }
});
