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
    await expect(heading).toHaveAccessibleName(/find your\s+sensi\./i);
    await expect(heading).toBeVisible();

    const start = page.getByRole("link", { name: /^start training$/i }).first();
    await expect(start).toHaveAttribute("href", "#guest-play");
    await start.click();
    await expect(page).toHaveURL(/#guest-play$/);
    const guest = page.locator(":target");
    await expect(guest).toContainText("Play as guest");
    await expect(
      guest.getByRole("link", { name: /pathline/i }),
    ).toHaveAttribute("href", "/play/pathline");
  });
});

test("the desktop homepage restores the original hero and chapter colors", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const hero = page.locator(".landing-hero");
  await expect(hero).toBeInViewport();
  const photo = hero.getByRole("img", { name: /a precision gaming mouse/i });
  await expect(photo).toHaveAttribute("src", /aim-desk-hero\.png/);
  await expect(photo).toHaveJSProperty("complete", true);
  expect(
    await photo.evaluate(
      (element) => (element as HTMLImageElement).naturalWidth,
    ),
  ).toBeGreaterThan(0);
  await expect(hero.locator("h1 em")).toHaveCSS("color", "rgb(189, 255, 45)");
  await expect(page.locator(".landing-shell")).toHaveCSS(
    "background-color",
    "rgb(3, 5, 4)",
  );
  await expect(page.locator("#training")).toHaveCSS(
    "background-color",
    "rgb(233, 233, 223)",
  );
  await expect(page.locator("#calibration")).toHaveCSS(
    "background-color",
    "rgb(189, 255, 45)",
  );
  await expect(hero.locator("canvas")).toHaveCount(0);

  await hero.getByRole("link", { name: /^start training$/i }).click();
  await expect(page.locator(":target")).toHaveAttribute("id", "guest-play");
  await expect(hero).not.toBeInViewport({ ratio: 0.5 });
  await expect(
    page
      .locator("#calibration")
      .getByRole("link", { name: "Find my sensitivity" }),
  ).toHaveAttribute("href", "/tools/calibrate");

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

  expect(
    await page
      .locator(".landing-crosshair")
      .evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).animationDuration),
      ),
  ).toBeLessThan(0.05);

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
    "Training",
    "Calibration",
    "Converter",
    "Scores",
    "Sign in",
  ]) {
    await expect(
      menu.getByRole("link", { name: label, exact: true }),
    ).toBeVisible();
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
  const frame = page.locator(".site-frame");

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
    await expect(frame).toHaveCSS("background-color", "rgb(3, 5, 4)");
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Footer navigation" }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  }
});
