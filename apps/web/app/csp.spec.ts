import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The public app's Content-Security-Policy is emitted per request by
// `apps/web/proxy.ts` (Next middleware) so it can carry a fresh nonce and
// `'strict-dynamic'`. This is the single source of the header -- `next.config.mjs`
// deliberately does not set a CSP. These assertions run against the proxy
// source text so a directive can never be silently dropped.
const proxySource = readFileSync(
  join(import.meta.dirname, "..", "proxy.ts"),
  "utf8",
);

describe("Content-Security-Policy (proxy.ts)", () => {
  it("declares every required directive", () => {
    for (const directive of [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ]) {
      expect(proxySource).toContain(directive);
    }
  });

  it("uses a nonce with strict-dynamic for scripts, never a bare 'unsafe-inline'", () => {
    expect(proxySource).toMatch(
      /script-src 'self' 'nonce-\$\{nonce\}' 'strict-dynamic'/,
    );
    expect(proxySource).not.toMatch(/script-src [^\n]*'unsafe-inline'/);
  });

  it("sets the header on the response", () => {
    expect(proxySource).toMatch(
      /response\.headers\.set\(\s*"Content-Security-Policy"/,
    );
  });

  it("emits no competing CSP header from next.config.mjs", () => {
    const config = readFileSync(
      join(import.meta.dirname, "..", "next.config.mjs"),
      "utf8",
    );
    expect(config).not.toMatch(/key:\s*["']Content-Security-Policy["']/);
  });
});
