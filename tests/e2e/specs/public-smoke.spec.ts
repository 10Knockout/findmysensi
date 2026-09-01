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

test("public home renders in a real browser without runtime errors", async ({
  page,
}) => {
  const browserErrors = captureBrowserErrors(page);
  const response = await page.goto("/");
  const hero = page.getByRole("heading", {
    level: 1,
    name: "Find the sensitivity you actually perform with.",
  });
  const startTraining = page.getByRole("link", { name: "START TRAINING" });

  expect(response?.ok()).toBe(true);
  await expect(hero).toBeVisible();
  await expect(startTraining).toBeVisible();
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
  await page.getByLabel("Password").fill("Valid!Password1");
  await page.getByLabel("Re-enter password").fill("Valid!Password1");
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

test("unfinished public ticket result URLs fail closed", async ({ page }) => {
  const response = await page.goto(
    "/results/00000000-0000-4000-8000-000000000001",
  );

  expect(response?.status()).toBe(404);
  await expect(page.locator("body")).not.toContainText("Run Complete");
});
