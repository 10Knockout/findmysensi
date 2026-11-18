import { afterEach, describe, expect, it, vi } from "vitest";
import { SITE_URL } from "../../../../../src/lib/site.js";
import { GET } from "./route.js";

const callbackSearch = "?code=test-code&state=test-state&scope=openid%20email";

function callbackRequest(search = callbackSearch, cookie = "oauth_state=test") {
  return new Request(`${SITE_URL}/api/auth/callback/google${search}`, {
    headers: { Cookie: cookie },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Google OAuth callback relay", () => {
  it("passes the query and state cookie to the private API and relays session cookies", async () => {
    vi.stubEnv("API_URL", "https://api.example.test");
    const responseHeaders = new Headers({
      Location: `${SITE_URL}/app/train/grid`,
    });
    responseHeaders.append(
      "Set-Cookie",
      "session=example; Secure; HttpOnly; Path=/",
    );
    responseHeaders.append("Set-Cookie", "oauth_state=; Max-Age=0; Path=/");
    const upstream = vi.fn(
      async () => new Response(null, { status: 302, headers: responseHeaders }),
    );
    vi.stubGlobal("fetch", upstream);

    const result = await GET(callbackRequest());
    expect(upstream).toHaveBeenCalledWith(
      new URL("https://api.example.test/api/v1/auth/google/callback"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ search: callbackSearch }),
        redirect: "manual",
        headers: {
          "Content-Type": "application/json",
          Cookie: "oauth_state=test",
          Origin: SITE_URL,
        },
      }),
    );
    expect(result.status).toBe(303);
    expect(result.headers.get("Location")).toBe(`${SITE_URL}/app/train/grid`);
    expect(result.headers.getSetCookie()).toEqual(
      responseHeaders.getSetCookie(),
    );
    expect(result.headers.get("Cache-Control")).toBe("no-store");
  });

  it("keeps callback errors on the site and skips relay without state cookies", async () => {
    vi.stubEnv("API_URL", "https://api.example.test");
    const upstream = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: {
            Location: "https://outside.example/app",
            "Set-Cookie": "session=discard",
          },
        }),
    );
    vi.stubGlobal("fetch", upstream);

    await GET(callbackRequest(callbackSearch, ""));
    expect(upstream).not.toHaveBeenCalled();
    const result = await GET(callbackRequest());
    expect(result.headers.get("Location")).toBe(
      `${SITE_URL}/login?oauth=failed`,
    );
    expect(result.headers.getSetCookie()).toEqual([]);
  });
});
