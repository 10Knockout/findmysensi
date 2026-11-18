import { expect, test } from "@playwright/test";

for (const route of ["/login?next=/app/train/grid", "/register"] as const) {
  test(`Google sign-in opens immediately from ${route}`, async ({ page }) => {
    const expectedNext = route.startsWith("/login")
      ? "/app/train/grid"
      : "/app";
    const authorizationURL =
      "https://accounts.google.com/o/oauth2/v2/auth?state=test-state";
    await page.route("**/api/auth/get-session", (request) =>
      request.fulfill({ json: null }),
    );
    await page.route("**/api/v1/auth/providers", (request) =>
      request.fulfill({ json: { google: true } }),
    );
    const started = [];
    await page.route("**/api/v1/auth/google/start", (request) => {
      started.push(request.request().postDataJSON());
      return request.fulfill({ json: { url: authorizationURL } });
    });
    await page.route("https://accounts.google.com/**", (request) =>
      request.fulfill({ body: "Google consent stand-in" }),
    );

    await page.goto(route);
    await expect(page.getByLabel("I confirm I am 18 or older.")).toHaveCount(0);
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect(page).toHaveURL(authorizationURL);
    expect(started).toEqual([{ flow: "post-signup", next: expectedNext }]);
  });
}

for (const rename of [false, true]) {
  test(`first-time Google users can ${rename ? "choose a new" : "keep the suggested"} username`, async ({
    page,
  }) => {
    const suggested = "aim_0123456789abcdefabcd";
    const username = rename ? "CustomAim" : suggested;
    const requests: unknown[] = [];
    await page.route("**/api/v1/auth/google/finish", async (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({ json: { pending: true, username: suggested } });
      const body = route.request().postDataJSON();
      requests.push(body);
      if (body.username === "TakenAim")
        return route.fulfill({ status: 409, json: { message: "Taken" } });
      return route.fulfill({ json: { pending: false } });
    });
    await page.route("**/api/auth/get-session", (route) =>
      route.fulfill({
        json: { user: { id: "test", username }, session: null },
      }),
    );
    await page.route("**/api/v1/me/settings", (route) =>
      route.fulfill({ status: 503 }),
    );
    await page.goto("/app/finish-google-signup?next=/app/settings");
    const finish = page.getByRole("button", { name: "Finish sign-up" });
    const input = page.getByLabel("Username", { exact: true });
    await expect(input).toHaveValue(suggested);
    await expect(finish).toBeDisabled();
    await page.getByLabel("I confirm I am 18 or older.").check();
    if (rename) {
      await input.fill("TakenAim");
      await finish.click();
      const notice = page
        .getByRole("alert")
        .filter({ hasText: "That username is already taken" });
      await expect(notice).toBeVisible();
      await input.fill(username);
    }
    await finish.click();
    await expect(page).toHaveURL(/\/app\/settings$/);
    expect(requests).toEqual([
      ...(rename ? [{ ageAttested: true, username: "TakenAim" }] : []),
      { ageAttested: true, username },
    ]);
  });
}

test("login and registration keep email forms when Google is disabled", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session", (request) =>
    request.fulfill({ json: null }),
  );
  await page.route("**/api/v1/auth/providers", (request) =>
    request.fulfill({ json: { google: false } }),
  );
  for (const route of ["/login", "/register"]) {
    const apiResponse = page.waitForResponse("**/api/v1/auth/providers");
    await page.goto(route);
    await apiResponse;
    await expect(
      page.getByRole("button", { name: /^(Sign In|Create Account)$/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toHaveCount(0);
  }
});

test("the Google callback is handled by the web app before the API rewrite", async ({
  request,
}) => {
  const result = await request.get(
    "/api/auth/callback/google?code=example&state=example",
    {
      maxRedirects: 0,
    },
  );
  expect(result.status()).toBe(303);
  expect(new URL(result.headers().location).pathname).toBe("/login");
  expect(new URL(result.headers().location).search).toBe("?oauth=failed");
  expect(result.headers()["cache-control"]).toBe("no-store");
});
