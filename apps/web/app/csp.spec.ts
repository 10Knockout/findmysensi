import { describe, expect, it } from "vitest";
import nextConfig from "../next.config.mjs";

describe("Content-Security-Policy header", () => {
  it("is present on all routes with the required directives", async () => {
    process.env.API_URL ||= "https://api.findmysensi.com";
    const groups = await nextConfig.headers();
    const all = groups.flatMap((g) => g.headers);
    const csp = all.find(
      (h) => h.key.toLowerCase() === "content-security-policy",
    );
    expect(csp).toBeTruthy();
    const value = csp!.value.replace(/\s+/g, " ");
    for (const directive of [
      "default-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "script-src 'self' 'unsafe-inline'",
    ]) {
      expect(value).toContain(directive);
    }
  });
});
