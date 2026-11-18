import { expect, test } from "@playwright/test";

test("homepage lets guests open every drill", async ({ page }) => {
  test.setTimeout(60_000);
  await page.route("**/api/**", (route) => route.fulfill({ status: 503 }));
  await page.goto("/");
  await page
    .getByRole("link", { name: /^start training$/i })
    .first()
    .click();
  await expect(page).toHaveURL(/#guest-play$/);
  await expect(page.locator(":target")).toContainText("Play as guest");
  const links = await page
    .locator("#training a[href^='/play/']")
    .evaluateAll((items) =>
      items.map((item) => ({
        url: item.getAttribute("href")!,
        title: item.querySelector("strong")!.textContent!.trim(),
      })),
    );
  expect(links.map(({ url }) => url)).toEqual(
    expect.arrayContaining([
      "/play/grid",
      "/play/multi",
      "/play/pinpoint",
      "/play/anchor-flick",
      "/play/microshot",
      "/play/motion-flick",
      "/play/reaction",
      "/play/strafe",
      "/play/smooth-track",
      "/play/switch-track",
      "/play/headline",
      "/play/turn180",
      "/play/pathline",
    ]),
  );
  for (const { url, title } of links) {
    await page.goto(url);
    await expect(page).toHaveURL((location) => location.pathname === url);
    await expect(
      page.getByRole("button", {
        name: `START ${title.toUpperCase()}`,
        exact: true,
      }),
    ).toBeVisible();
  }
});

test("guest practice completes locally with signed-in cookies present", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(60_000);
  const apiCalls: string[] = [];
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: "existing-session",
      url: baseURL!,
    },
  ]);
  await page.route("**/api/**", (route) => {
    apiCalls.push(route.request().url());
    return route.fulfill({ status: 503 });
  });
  await page.setViewportSize({ width: 800, height: 600 });
  await page.clock.install();
  await page.goto("/play/pinpoint");
  await expect(page.getByText("Guest runs are unranked.")).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const sensitivity = page.getByLabel("FindMySensi Browser Sensitivity", {
    exact: true,
  });
  const apply = page.getByRole("button", { name: "SAVE & APPLY", exact: true });
  await sensitivity.clear();
  await expect(sensitivity).toHaveValue("");
  await sensitivity.pressSequentially("0");
  await expect(sensitivity).toHaveValue("0");
  await apply.click();
  await expect(page.getByRole("status")).toContainText(
    "Aim sensitivity is invalid",
  );
  await sensitivity.press("ControlOrMeta+a");
  await sensitivity.press("Backspace");
  await expect(sensitivity).toHaveValue("");
  await sensitivity.pressSequentially("0.125");
  await expect(sensitivity).toHaveValue("0.125");
  await apply.click();
  const start = page.getByRole("button", {
    name: "START PRECISION SIX",
    exact: true,
  });
  await start.click();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.id))
    .toBe("simulation-canvas");
  await expect(page.getByText("3", { exact: true })).toBeVisible();
  await page.clock.runFor(64_000);
  await expect(
    page.getByRole("heading", { name: "Precision Six results" }),
  ).toBeVisible();
  await expect(page.getByText("0", { exact: true }).first()).toBeVisible();
  expect(apiCalls).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([
    "findmysensi:guest-settings:v1",
  ]);
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await expect(start).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByLabel("FindMySensi Browser Sensitivity", { exact: true }),
  ).toHaveValue("0.125");
});

test("touch-only guest browsers show the mouse requirement", async ({
  browser,
  baseURL,
}) => {
  const page = await browser.newPage({
    baseURL,
    hasTouch: true,
    isMobile: true,
  });
  try {
    await page.goto("/play/grid");
    await expect(
      page.getByText("Touch-only play is unavailable.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Choose another drill" }),
    ).toBeVisible();
  } finally {
    await page.close();
  }
});
