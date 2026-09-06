import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });

  return errors;
}

test("public home renders and shows a real-data error state when leaderboard is unavailable", async ({
  page,
}) => {
  await page.route("**/api/v1/leaderboards/gridshot", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Leaderboard unavailable in browser smoke",
      }),
    });
  });

  const response = await page.goto("/");
  const hero = page.getByRole("heading", {
    level: 1,
    name: "Find your sensi.",
  });
  const startTraining = page.getByRole("link", { name: "START TRAINING" });
  const leaderboardError = page
    .getByRole("alert")
    .filter({ hasText: "Could not load the live Gridshot leaderboard" });

  expect(response?.ok()).toBe(true);
  await expect(hero).toBeVisible();
  await expect(startTraining).toBeVisible();
  await expect(leaderboardError).toBeVisible();
});

test("converter maps Valorant into the single FindMySensi sensitivity scale", async ({
  page,
}) => {
  const browserErrors = captureBrowserErrors(page);

  const response = await page.goto("/tools/converter");
  expect(response?.ok()).toBe(true);
  await expect(page.getByLabel("SENSITIVITY")).toHaveValue("0.125");
  await expect(page.getByTestId("fms-sensitivity-result")).toHaveText("0.175");
  await expect(
    page.getByText("Every training game uses it.", { exact: false }),
  ).toBeVisible();

  await page.getByLabel("SENSITIVITY").fill("0.25");
  await expect(page.getByTestId("fms-sensitivity-result")).toHaveText("0.35");
  expect(browserErrors).toEqual([]);
});

test("registration requires and submits the 18+ attestation without DOB", async ({
  page,
}) => {
  const browserErrors = captureBrowserErrors(page);
  let registrationPayload: Record<string, unknown> | null = null;

  await page.route("**/api/v1/register", async (route) => {
    const payload = route.request().postDataJSON();
    registrationPayload = payload as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });

  await page.goto("/register");
  const ageAttestation = page.getByRole("checkbox", {
    name: "I confirm that I am 18 years of age or older.",
  });

  await expect(ageAttestation).toBeVisible();
  await expect(ageAttestation).not.toBeChecked();
  await expect(ageAttestation).toHaveAttribute("required", "");

  await page.getByLabel("Username").fill("BrowserAudit");
  await page.getByLabel("Email").fill("browser-audit@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Valid!Password1");
  await page
    .getByLabel("Re-enter password", { exact: true })
    .fill("Valid!Password1");
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(ageAttestation).toBeFocused();
  expect(registrationPayload).toBeNull();

  await ageAttestation.check();
  await page.getByRole("button", { name: "Create Account" }).click();

  const verifyHeading = page.getByRole("heading", {
    name: "Verify your email",
  });
  await expect(verifyHeading).toBeVisible();
  expect(registrationPayload).toMatchObject({
    username: "BrowserAudit",
    email: "browser-audit@example.com",
    ageAttested: true,
  });
  expect(registrationPayload).not.toHaveProperty("dateOfBirth");
  expect(registrationPayload).not.toHaveProperty("dob");
  expect(browserErrors).toEqual([]);
});

test("login continuation route renders safely", async ({ page }) => {
  const response = await page.goto(
    "/login?next=%2Fapp%2Ftrain%2Fgrid%2Fresults",
  );
  const heading = page.getByRole("heading", { name: "Sign In" });

  expect(response?.ok()).toBe(true);
  await expect(heading).toBeVisible();
});

test("authenticated Gridshot shell initializes the real trainer canvas", async ({
  page,
}, testInfo) => {
  const browserErrors = captureBrowserErrors(page);
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
      expiresAt: "2026-09-02T00:00:00.000Z",
    },
  };
  const trainerSettings = {
    // Deliberately high for this browser proof so one physical mouse sweep can
    // reach both camera poles without synthetic DOM events.
    fmsSensitivity: "10",
    nominalDpi: 800,
    fovDegrees: 103,
    targetColor: "#7CFF6B",
    targetOpacity: 1,
    targetOutline: false,
    crosshairCode: null,
    graphicsPreset: "automatic",
    resolution: "native",
    customResolutionWidth: null,
    customResolutionHeight: null,
    aspectRatio: "16:9",
    scalingMode: "fit",
    inputProcessing: "automatic",
  };

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session),
    });
  });
  await page.route("**/api/v1/me/settings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(trainerSettings),
    });
  });

  const response = await page.goto("/app/train/grid?inputDebug=1");

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { name: "Gridshot" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "START GRIDSHOT" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("FindMySensi Gridshot simulation"),
  ).toBeVisible();

  const startButton = page.getByRole("button", { name: "START GRIDSHOT" });
  const startButtonBox = await startButton.boundingBox();
  expect(startButtonBox).not.toBeNull();
  await startButton.click();
  await expect(page.getByText("TIME", { exact: true })).toBeVisible({
    timeout: 6_000,
  });
  await expect(page.getByText("SCORE", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gridshot" })).toBeHidden();
  expect(
    await page.evaluate(() => document.pointerLockElement?.id ?? null),
  ).toBe("simulation-canvas");
  await page.screenshot({ path: testInfo.outputPath("gridshot-arena.png") });

  const canvas = page.getByLabel("FindMySensi Gridshot simulation");
  const targetPoint = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext("2d");
    if (!context) return null;
    const { width, height } = canvasElement;
    const pixels = context.getImageData(0, 0, width, height).data;
    const candidates: Array<readonly [number, number]> = [];

    // Sample bright target-green pixels. The red-channel threshold excludes
    // the cyan crosshair while keeping the green target bodies.
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const offset = (y * width + x) * 4;
        const red = pixels[offset] ?? 0;
        const green = pixels[offset + 1] ?? 0;
        const blue = pixels[offset + 2] ?? 0;
        if (red > 60 && green > red * 1.3 && green > blue * 1.35) {
          candidates.push([x, y]);
        }
      }
    }

    let best: readonly [number, number] | null = null;
    let bestNeighbors = 0;
    for (const candidate of candidates) {
      let neighbors = 0;
      for (const other of candidates) {
        const dx = candidate[0] - other[0];
        const dy = candidate[1] - other[1];
        if (dx * dx + dy * dy <= 18 * 18) neighbors++;
      }
      if (neighbors > bestNeighbors) {
        best = candidate;
        bestNeighbors = neighbors;
      }
    }
    if (!best || bestNeighbors < 8) return null;

    const rect = canvasElement.getBoundingClientRect();
    return {
      x: (best[0] / width) * rect.width,
      y: (best[1] / height) * rect.height,
      width: rect.width,
      height: rect.height,
    };
  });
  expect(targetPoint).not.toBeNull();
  if (!targetPoint || !startButtonBox) {
    throw new Error(
      "Gridshot target or Start button geometry was unavailable.",
    );
  }

  const horizontalFovRadians = (103 / 180) * Math.PI;
  const focalLength =
    targetPoint.width / 2 / Math.tan(horizontalFovRadians / 2);
  const yawDegrees =
    (Math.atan((targetPoint.x - targetPoint.width / 2) / focalLength) * 180) /
    Math.PI;
  const pitchDegrees =
    (Math.atan((targetPoint.height / 2 - targetPoint.y) / focalLength) * 180) /
    Math.PI;
  const degreesPerCount = 10 * 0.05;
  let mouseX = startButtonBox.x + startButtonBox.width / 2;
  let mouseY = startButtonBox.y + startButtonBox.height / 2;
  mouseX += Math.round(yawDegrees / degreesPerCount);
  mouseY += Math.round(-pitchDegrees / degreesPerCount);
  await page.mouse.move(mouseX, mouseY);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByText("1 / 0", { exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("gridshot-target-hit.png"),
  });

  await page.mouse.move(mouseX, 719);
  mouseY = 719;
  const bottomFrame = await canvas.screenshot();
  await page.screenshot({
    path: testInfo.outputPath("gridshot-look-down.png"),
  });
  expect(
    await page.evaluate(() => document.pointerLockElement?.id ?? null),
  ).toBe("simulation-canvas");

  await page.mouse.move(mouseX, mouseY - 20);
  mouseY -= 20;
  await expect
    .poll(async () => !(await canvas.screenshot()).equals(bottomFrame))
    .toBe(true);

  await page.mouse.move(mouseX, 0);
  mouseY = 0;
  const overheadFrame = await canvas.screenshot();
  await page.screenshot({ path: testInfo.outputPath("gridshot-look-up.png") });

  await page.mouse.move(mouseX, mouseY + 20);
  await expect
    .poll(async () => !(await canvas.screenshot()).equals(overheadFrame))
    .toBe(true);

  const movementCount = async () => {
    const overlayText =
      (await page.getByTestId("input-verification-overlay").textContent()) ??
      "";
    const match = overlayText.match(/Movement events\s+([\d,]+)/);
    return Number((match?.[1] ?? "0").replaceAll(",", ""));
  };
  const beforeStress = await movementCount();
  for (let index = 0; index < 80; index++) {
    mouseX += index % 2 === 0 ? 24 : -24;
    mouseY += index % 4 < 2 ? 12 : -12;
    await page.mouse.move(mouseX, mouseY);
    await page.waitForTimeout(40);
  }
  await expect.poll(movementCount).toBeGreaterThan(beforeStress + 60);

  const postStressFrame = await canvas.screenshot();
  await page.mouse.move(mouseX + 20, mouseY - 20);
  await expect
    .poll(async () => !(await canvas.screenshot()).equals(postStressFrame))
    .toBe(true);
  expect(
    await page.evaluate(() => document.pointerLockElement?.id ?? null),
  ).toBe("simulation-canvas");
  expect(browserErrors).toEqual([]);
});

test("unfinished public ticket result URLs fail closed", async ({ page }) => {
  const response = await page.goto(
    "/results/00000000-0000-4000-8000-000000000001",
  );

  expect(response?.status()).toBe(404);
  await expect(page.locator("body")).not.toContainText("Run Complete");
});

test("authenticated Trainer Home renders user greeting, Gridshot play link, and Settings link", async ({
  page,
}) => {
  const browserErrors = captureBrowserErrors(page);
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
      expiresAt: "2026-09-02T00:00:00.000Z",
    },
  };
  const trainerSettings = {
    fmsSensitivity: "1.0",
    nominalDpi: 800,
    fovDegrees: 103,
    targetColor: "#7CFF6B",
    targetOpacity: 1,
    targetOutline: false,
    crosshairCode: null,
    graphicsPreset: "automatic",
    resolution: "native",
    customResolutionWidth: null,
    customResolutionHeight: null,
    aspectRatio: "16:9",
    scalingMode: "fit",
    inputProcessing: "automatic",
  };

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session),
    });
  });
  await page.route("**/api/v1/me/settings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(trainerSettings),
    });
  });

  const response = await page.goto("/app");
  expect(response?.ok()).toBe(true);

  await expect(
    page.getByRole("heading", { name: "BrowserAudit" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "PLAY →" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("authenticated Settings page renders profile, aim, video, and input sections", async ({
  page,
}) => {
  const browserErrors = captureBrowserErrors(page);
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
      expiresAt: "2026-09-02T00:00:00.000Z",
    },
  };
  const profile = {
    username: "BrowserAudit",
    avatarId: "avatar-default",
    frameId: "frame-none",
  };
  const trainerSettings = {
    fmsSensitivity: "1.0",
    nominalDpi: 800,
    fovDegrees: 103,
    targetColor: "#7CFF6B",
    targetOpacity: 1,
    targetOutline: false,
    crosshairCode: null,
    graphicsPreset: "automatic",
    resolution: "native",
    customResolutionWidth: null,
    customResolutionHeight: null,
    aspectRatio: "16:9",
    scalingMode: "fit",
    inputProcessing: "automatic",
  };

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session),
    });
  });
  await page.route("**/api/v1/me/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(profile),
    });
  });
  await page.route("**/api/v1/me/settings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(trainerSettings),
    });
  });

  const response = await page.goto("/app/settings");
  expect(response?.ok()).toBe(true);

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aim" })).toBeVisible();
  await expect(
    page.getByLabel("Aim Sensitivity (Aimlabs Default)"),
  ).toHaveValue("1");
  await expect(
    page.getByRole("link", { name: "Convert your game sensitivity" }),
  ).toBeVisible();
  await expect(page.getByText("Valorant Equivalent")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save Settings" }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("authenticated Results page displays honest local results wording and metrics", async ({
  page,
}) => {
  const browserErrors = captureBrowserErrors(page);
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
      expiresAt: "2026-09-02T00:00:00.000Z",
    },
  };

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session),
    });
  });

  await page.addInitScript(() => {
    window.localStorage.setItem(
      "findmysensi:practice_history:v1",
      JSON.stringify([
        {
          id: "practice-test-1",
          modeId: "grid",
          timestamp: Date.now(),
          score: 72450,
          hits: 65,
          shots: 70,
          misses: 5,
          accuracyPercentage: 93,
          durationSeconds: 60,
          killsPerSecond: 1.08,
          exactReplayPreserved: true,
          inputOverflowEvents: 0,
          inputHighWaterMark: 8,
        },
      ]),
    );
  });

  const response = await page.goto("/app/train/grid/results");
  expect(response?.ok()).toBe(true);

  // Assert honest local results badge and explanation
  await expect(page.locator("text=Local Result · Not Submitted")).toBeVisible();
  await expect(
    page.locator(
      "text=This run is stored locally. Official leaderboard verification is not enabled yet.",
    ),
  ).toBeVisible();

  // Assert score card displays formatted score
  await expect(page.locator("text=72,450")).toBeVisible();
  await expect(page.locator("text=93%")).toBeVisible();

  // Assert obsolete "Practice Mode" copy is NOT present
  await expect(page.locator("body")).not.toContainText(
    "Practice Mode (Offline / Not Synced)",
  );
  await expect(page.locator("body")).not.toContainText(
    "Results from your practice session.",
  );
  expect(browserErrors).toEqual([]);
});
