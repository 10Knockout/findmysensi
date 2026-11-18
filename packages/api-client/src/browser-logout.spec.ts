import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserApiClient } from "./browser.js";

describe("browser sign-out", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends a valid JSON body with the session cookie", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ success: true }));
    vi.stubGlobal("fetch", fetch);

    expect(await new BrowserApiClient().logout()).toMatchObject({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/sign-out",
      expect.objectContaining({
        method: "POST",
        body: "{}",
        credentials: "include",
      }),
    );
  });

  it("reports a rejected sign-out", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ message: "Request rejected" }, { status: 400 }),
        ),
    );

    expect(await new BrowserApiClient().logout()).toEqual({
      ok: false,
      error: "Request rejected",
    });
  });
});
