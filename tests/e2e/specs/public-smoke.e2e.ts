import { expect, test, type Page } from "@playwright/test";

// The `grid` mode ships as "Grid Rush" (see the scenario catalog). The heading,
// the start button and the canvas aria-label are all derived from that title,
// so they move together whenever the catalog is renamed.
const GRID_MODE_TITLE = "Grid Rush";
const GRID_MODE_START_LABEL = `START ${GRID_MODE_TITLE.toUpperCase()}`;
const GRID_MODE_CANVAS_LABEL = `FindMySensi ${GRID_MODE_TITLE} simulation`;

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
  await page.route("**/api/v2/leaderboards/**", async (route) => {
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
    .filter({ hasText: "Could not load Grid Rush" });

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
  await expect(page.getByTestId("fms-sensitivity-result")).toHaveText("0.245");
  await expect(page.getByTestId("fms-sensitivity-canonical")).toContainText(
    "0.175",
  );
  await expect(
    page.getByText("Every training game uses it.", { exact: false }),
  ).toBeVisible();

  await page.getByLabel("SENSITIVITY").fill("0.25");
  await expect(page.getByTestId("fms-sensitivity-result")).toHaveText("0.49");
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

test("authenticated Grid Rush shell initializes the real trainer canvas", async ({
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
      expiresAt: "2099-09-02T00:00:00.000Z",
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
  await expect(
    page.getByRole("heading", { name: GRID_MODE_TITLE }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: GRID_MODE_START_LABEL }),
  ).toBeVisible();
  await expect(page.getByLabel(GRID_MODE_CANVAS_LABEL)).toBeVisible();

  const startButton = page.getByRole("button", { name: GRID_MODE_START_LABEL });
  const startButtonBox = await startButton.boundingBox();
  expect(startButtonBox).not.toBeNull();
  await startButton.click();
  await expect(page.getByText("TIME", { exact: true })).toBeVisible({
    timeout: 6_000,
  });
  await expect(page.getByText("SCORE", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: GRID_MODE_TITLE }),
  ).toBeHidden();
  expect(
    await page.evaluate(() => document.pointerLockElement?.id ?? null),
  ).toBe("simulation-canvas");
  await page.screenshot({ path: testInfo.outputPath("gridshot-arena.png") });

  const canvas = page.getByLabel(GRID_MODE_CANVAS_LABEL);
  const locateTarget = () =>
    canvas.evaluate((element) => {
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
  if (!startButtonBox) {
    throw new Error(
      `${GRID_MODE_TITLE} Start button geometry was unavailable.`,
    );
  }

  const degreesPerCount = 10 * 0.05;
  let mouseX = startButtonBox.x + startButtonBox.width / 2;
  let mouseY = startButtonBox.y + startButtonBox.height / 2;

  // Pointer-lock movement differs slightly between desktop backends. Re-read
  // rendered target position after each move instead of trusting one open-loop
  // estimate. This still proves real camera movement and a real scored hit.
  for (let correction = 0; correction < 3; correction++) {
    const targetPoint = await locateTarget();
    expect(targetPoint).not.toBeNull();
    if (!targetPoint) {
      throw new Error(`${GRID_MODE_TITLE} target geometry was unavailable.`);
    }

    const horizontalFovRadians = (103 / 180) * Math.PI;
    const focalLength =
      targetPoint.width / 2 / Math.tan(horizontalFovRadians / 2);
    const yawDegrees =
      (Math.atan((targetPoint.x - targetPoint.width / 2) / focalLength) * 180) /
      Math.PI;
    const pitchDegrees =
      (Math.atan((targetPoint.height / 2 - targetPoint.y) / focalLength) *
        180) /
      Math.PI;
    const dx = Math.round(yawDegrees / degreesPerCount);
    const dy = Math.round(-pitchDegrees / degreesPerCount);
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) break;
    mouseX += dx;
    mouseY += dy;
    await page.mouse.move(mouseX, mouseY);
  }
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
    // textContent concatenates the label cell and the value cell with no
    // separator ("Movement events0"), so this must not require whitespace.
    const match = overlayText.match(/Movement events\s*([\d,]+)/);
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

  await page.route("**/api/v2/runs", async (route) => {
    const submitted = route.request().postDataJSON() as {
      runId: string;
      modeId: string;
      scenarioVersion: number;
      scoringVersion: number;
    };
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        protocolVersion: 2,
        runId: submitted.runId,
        submissionStatus: "stored",
        runClass: "practice",
        competitiveStatus: "listed",
        leaderboard: {
          board: {
            boardId: `${submitted.modeId}:scenario-${submitted.scenarioVersion}:scoring-${submitted.scoringVersion}`,
            modeId: submitted.modeId,
            scenarioVersion: submitted.scenarioVersion,
            scoringVersion: submitted.scoringVersion,
          },
          totalPlayers: 0,
          percentileMinimumPlayers: 10,
          standing: null,
        },
      }),
    });
  });

  await page.route("**/api/v1/me/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        username: "BrowserAudit",
        avatarId: "avatar-default",
        frameId: "frame-none",
        tagId: "tag-none",
      }),
    });
  });

  await page.route("**/api/v2/leaderboards/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        protocolVersion: 2,
        board: {
          boardId: "grid:scenario-0:scoring-0:season-2026-09",
          modeId: "grid",
          scenarioVersion: 0,
          scoringVersion: 0,
          seasonId: "2026-09",
          seasonStartsAt: "2026-09-01T00:00:00.000Z",
          seasonEndsAt: "2026-10-01T00:00:00.000Z",
        },
        rows: [],
        page: { offset: 0, limit: 10, hasMore: false },
        totalPlayers: 0,
        percentileMinimumPlayers: 10,
        standing: null,
      }),
    });
  });

  await page.addInitScript(() => {
    const completedAt = Date.now();
    const previousCompletedAt = completedAt - 120_000;
    const settings = {
      fmsSensitivity: "0.175",
      nominalDpi: 800,
      cmPer360: 46.68,
      fovDegrees: 103,
      resolution: "1920x1080",
      backingWidth: 1920,
      backingHeight: 1080,
      cssWidth: 1920,
      cssHeight: 1080,
      devicePixelRatio: 1,
      scalingMode: "fill",
      fullscreen: true,
      graphicsPreset: "automatic",
      crosshairCode: null,
      rawPointerInputAccepted: false,
      platform: "Windows",
      browser: "Chrome",
      medianRenderFps: null,
      p95FrameTimeMs: null,
      inputOverflowEvents: 0,
      inputHighWaterMark: 8,
    };
    const summary = {
      id: "practice-test-1",
      modeId: "grid",
      timestamp: completedAt,
      score: 72450,
      hits: 65,
      shots: 70,
      misses: 5,
      accuracyPercentage: (65 / 70) * 100,
      durationSeconds: 60,
      killsPerSecond: 1.08,
      averageAcquisitionTicks: 38.4,
      exactReplayPreserved: true,
      inputOverflowEvents: 0,
      inputHighWaterMark: 8,
    };
    window.localStorage.setItem(
      "fms_run_records_v1",
      JSON.stringify([
        {
          runId: "practice-test-1",
          modeId: "grid",
          scenarioVersion: 0,
          scoringVersion: 0,
          analyticsVersion: 1,
          seed: [1, 2, 3, 4],
          startedAt: completedAt - 60_000,
          completedAt,
          activeDurationMs: 60_000,
          finalScore: 72450,
          leaderboardEligible: false,
          invalidationReasons: ["raw-input-unavailable"],
          settings,
          summary,
        },
        {
          runId: "practice-test-pb",
          modeId: "grid",
          scenarioVersion: 0,
          scoringVersion: 0,
          analyticsVersion: 1,
          seed: [5, 6, 7, 8],
          startedAt: previousCompletedAt - 60_000,
          completedAt: previousCompletedAt,
          activeDurationMs: 60_000,
          finalScore: 75000,
          leaderboardEligible: true,
          invalidationReasons: [],
          settings: { ...settings, rawPointerInputAccepted: true },
          summary: {
            ...summary,
            id: "practice-test-pb",
            timestamp: previousCompletedAt,
            score: 75000,
          },
        },
      ]),
    );
  });

  const response = await page.goto("/app/train/grid/results");
  expect(response?.ok()).toBe(true);

  // Assert honest practice-sync badge and explanation.
  await expect(page.getByText("Saved to Account", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/now on the public leaderboard/),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Grid Rush", level: 1 }),
  ).toBeVisible();
  const runSummary = page.getByRole("region", { name: "Run Summary" });
  await expect(runSummary.getByText("72,450", { exact: true })).toBeVisible();
  await expect(runSummary.getByText("75,000", { exact: true })).toBeVisible();
  await expect(page.locator("text=−2,550")).toBeVisible();
  await expect(runSummary.getByText("92.86%", { exact: true })).toBeVisible();
  await expect(page.getByText("Not leaderboard eligible")).toBeVisible();
  await expect(
    page.getByText("Raw mouse input was not available."),
  ).toBeVisible();

  const taskMetrics = page.getByRole("region", { name: "Task Metrics" });
  await expect(taskMetrics.getByText("65", { exact: true })).toBeVisible();
  await expect(taskMetrics.getByText("70", { exact: true })).toBeVisible();
  await expect(taskMetrics.getByText("300 ms", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("link", { name: "Play Again" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to Hub" })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  // Assert obsolete "Practice Mode" copy is NOT present
  await expect(page.locator("body")).not.toContainText(
    "Practice Mode (Offline / Not Synced)",
  );
  await expect(page.locator("body")).not.toContainText(
    "Results from your practice session.",
  );
  expect(browserErrors).toEqual([]);
});
