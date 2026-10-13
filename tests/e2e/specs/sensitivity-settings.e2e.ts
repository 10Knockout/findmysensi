import { expect, test } from "@playwright/test";

test("converted sensitivity survives saving, Settings, and in-game Settings", async ({
  page,
}, testInfo) => {
  let saved: Record<string, unknown> = {
    fmsSensitivity: null,
    nominalDpi: 1600,
    fovDegrees: 103,
    targetColor: "#7cff6b",
    targetOpacity: 1,
    targetOutline: false,
    crosshairCode: null,
    weaponHand: "right",
    graphicsPreset: "automatic",
    resolution: "native",
    customResolutionWidth: null,
    customResolutionHeight: null,
    aspectRatio: "16:9",
    scalingMode: "fit",
    inputProcessing: "automatic",
  };
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, json: {} }),
  );
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({
      status: 200,
      json: {
        user: {
          id: "sensitivity-test",
          email: "sensitivity@example.com",
          username: "SensitivityTest",
          emailVerified: true,
        },
        session: {
          id: "sensitivity-session",
          userId: "sensitivity-test",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      },
    }),
  );
  await page.route("**/api/v1/me/profile", (route) =>
    route.fulfill({ status: 200, json: { username: "SensitivityTest" } }),
  );
  await page.route("**/api/v1/me/settings", async (route) => {
    if (route.request().method() === "PUT") {
      saved = route.request().postDataJSON();
      writes.push(saved);
    }
    await route.fulfill({ status: 200, json: saved });
  });

  await page.goto("/app");
  await page
    .getByRole("button", { name: "Aimlabs Default", exact: true })
    .click();
  await page
    .getByLabel("Aimlabs Default Sensitivity", { exact: true })
    .fill("0.485179");
  await expect(page.getByTestId("converted-fms-sensitivity")).toHaveText(
    "0.679251",
  );
  await expect(
    page.getByText("23.56 cm / 360°", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save Sensitivity", exact: true })
    .click();
  await expect.poll(() => writes.length).toBe(1);
  expect(saved).toMatchObject({ fmsSensitivity: "0.679251", nominalDpi: 1600 });

  await page.goto("/app/settings");
  await expect(
    page.getByLabel("FindMySensi Browser Sensitivity", { exact: true }),
  ).toHaveValue("0.679251");
  await expect(page.getByTestId("sensitivity-turn-distance")).toHaveText(
    "23.56 cm / 360°",
  );
  await expect(page.getByTestId("sensitivity-aimlabs-equivalent")).toHaveText(
    "0.485179",
  );
  await page.screenshot({
    path: testInfo.outputPath("corrected-settings.png"),
    fullPage: true,
  });

  await page.goto("/app/train/grid");
  await page
    .getByRole("button", { name: "START GRID RUSH", exact: true })
    .click();
  await expect(page.getByText("TIME", { exact: true })).toBeVisible({
    timeout: 6000,
  });
  // Headless Chromium does not release Pointer Lock on a synthetic Escape.
  // Exercise the real release API and the trainer's pointerlockchange handler.
  await page.evaluate(() => document.exitPointerLock());
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByLabel("FindMySensi Browser Sensitivity", { exact: true }),
  ).toHaveValue("0.679251");
  await expect(page.getByTestId("sensitivity-turn-distance")).toHaveText(
    "23.56 cm / 360°",
  );
  await expect(page.getByTestId("sensitivity-aimlabs-equivalent")).toHaveText(
    "0.485179",
  );
  await page.getByRole("button", { name: "SAVE & APPLY", exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(saved).toMatchObject({ fmsSensitivity: "0.679251", nominalDpi: 1600 });

  saved = { ...saved, nominalDpi: null };
  await page.goto("/app/calibrate");
  await page.getByRole("button", { name: "CS2 0.398", exact: true }).click();
  await expect(page.getByTestId("calibration-starting-sensitivity")).toHaveText(
    "0.245168",
  );
  await expect(
    page.getByRole("button", { name: "CS2", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Valorant 0.125", exact: true })
    .click();
  await expect(page.getByTestId("calibration-starting-sensitivity")).toHaveText(
    "0.245",
  );
  expect(writes).toHaveLength(2);
  await expect(page.getByLabel("Mouse DPI", { exact: true })).toHaveValue("");
  await page
    .getByRole("button", { name: "Start Find My Sensi", exact: true })
    .click();
  await expect(
    page.getByText(
      "Enter your mouse DPI before starting the sensitivity test.",
    ),
  ).toBeVisible();
  await page.goto("/app/settings");
  await expect(page.getByTestId("sensitivity-turn-distance")).toHaveText(
    "Set your mouse DPI",
  );
});
