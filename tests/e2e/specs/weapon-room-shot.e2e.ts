import { expect, test } from "@playwright/test";

// One-off visual capture for the cube-room backdrop + weapon viewmodel redesign.
// Not a CI gate: it exists to produce screenshots a human can eyeball against the
// reference images. Delete once the look is signed off.

const GRID_MODE_TITLE = "Grid Rush";
const GRID_MODE_START_LABEL = `START ${GRID_MODE_TITLE.toUpperCase()}`;
const GRID_MODE_CANVAS_LABEL = `FindMySensi ${GRID_MODE_TITLE} simulation`;

const session = {
  user: {
    id: "browser-user",
    email: "browser-user@example.com",
    username: "BrowserAudit",
    emailVerified: true,
  },
  session: {
    id: "browser-session",
    userId: "browser-user",
    expiresAt: "2099-09-02T00:00:00.000Z",
  },
};

function trainerSettings(weaponHand: "right" | "left") {
  return {
    fmsSensitivity: "6",
    nominalDpi: 800,
    fovDegrees: 103,
    targetColor: "#7CFF6B",
    targetOpacity: 1,
    targetOutline: false,
    crosshairCode: null,
    weaponHand,
    graphicsPreset: "automatic",
    resolution: "native",
    customResolutionWidth: null,
    customResolutionHeight: null,
    aspectRatio: "16:9",
    scalingMode: "fit",
    inputProcessing: "automatic",
  };
}

for (const hand of ["right", "left"] as const) {
  test(`weapon + cube room capture (${hand} hand)`, async ({
    page,
  }, testInfo) => {
    await page.route("**/api/auth/get-session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(session),
      }),
    );
    await page.route("**/api/v1/me/settings", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(trainerSettings(hand)),
      }),
    );

    const response = await page.goto("/app/train/grid?inputDebug=1");
    expect(response?.ok()).toBe(true);

    const canvas = page.getByLabel(GRID_MODE_CANVAS_LABEL);
    await expect(canvas).toBeVisible();

    // Pre-start: backdrop only.
    await canvas.screenshot({
      path: testInfo.outputPath(`room-${hand}-idle.png`),
    });

    await page.getByRole("button", { name: GRID_MODE_START_LABEL }).click();
    await expect(page.getByText("TIME", { exact: true })).toBeVisible({
      timeout: 6_000,
    });
    // Let a few frames render the viewmodel + room in the active state.
    await page.waitForTimeout(700);

    await canvas.screenshot({
      path: testInfo.outputPath(`room-${hand}-active.png`),
    });
    await page.screenshot({
      path: testInfo.outputPath(`page-${hand}-active.png`),
      fullPage: false,
    });
  });
}
