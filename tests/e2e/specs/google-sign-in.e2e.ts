import { expect, test } from "@playwright/test";

for (const route of ["/login?next=/app/train/grid", "/register"] as const) {
  test(`Google sign-in starts from ${route} with age confirmation`, async ({
    page,
  }) => {
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
    await page.getByRole("button", { name: "Continue with Google" }).click();
    const submit = page.getByRole("button", { name: "Open Google sign-in" });
    await expect(submit).toBeDisabled();
    expect(started).toEqual([]);

    await page
      .getByLabel("I confirm I am 18 or older.", { exact: true })
      .check();
    await submit.click();
    await expect(page).toHaveURL(authorizationURL);
    expect(started).toEqual([{ ageAttested: true, next: expectedNext }]);
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
