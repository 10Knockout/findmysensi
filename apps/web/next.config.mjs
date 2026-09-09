/** @type {import('next').NextConfig} */
function resolveApiTarget() {
  const configured = process.env.API_URL?.trim();
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("API_URL is required for a production web build.");
    }
    return "http://localhost:4000";
  }

  let parsed;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error("API_URL must be a valid absolute URL.");
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname !== "/" && parsed.pathname !== "")
  ) {
    throw new Error("API_URL must be an origin without credentials or a path.");
  }
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("API_URL must use HTTPS in production.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("API_URL must use HTTP or HTTPS.");
  }

  return parsed.origin;
}

const apiTarget = resolveApiTarget();

// The Content-Security-Policy is set per-request in `apps/web/proxy.ts` so it
// can carry a fresh `nonce` and `'strict-dynamic'`. Do not add a CSP here as
// well -- a second header cannot be nonce-aware and only weakens the policy on
// routes the proxy does not match (`/_next/static/*`). `proxy.ts` is the single
// source; `app/csp.spec.ts` guards its directives.

const nextConfig = {
  poweredByHeader: false,
  // The development indicator is a clickable bottom-left overlay. Gridshot
  // uses the entire viewport as its aim surface, so the indicator must not
  // intercept movement or shots during local development.
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  transpilePackages: [
    "@findmysensi/protocol",
    "@findmysensi/aim-core",
    "@findmysensi/input-browser",
    "@findmysensi/render-canvas",
    "@findmysensi/scenarios",
    "@findmysensi/analytics",
    "@findmysensi/scoring",
    "@findmysensi/api-client",
    "@findmysensi/sensitivity",
    "@findmysensi/crosshair",
  ],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
