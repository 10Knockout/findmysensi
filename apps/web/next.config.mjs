/** @type {import('next').NextConfig} */
if (process.env.NODE_ENV === "production" && process.env.USE_MOCK_API) {
  throw new Error("USE_MOCK_API must never be enabled in production.");
}
// NOTE: API_URL is required in production (must point at the deployed
// private backend API's origin) -- see docs/DEPLOYMENT.md. It is
// deliberately NOT enforced with a hard throw here: unlike the backend's
// own required-env-var guards (which only run at request time, never
// during a type-check-only build step), this file is *executed* by
// `next build` itself, so a throw here would also break local/CI builds
// that legitimately verify the frontend compiles without a live backend
// deployed. Omitting API_URL in a real deployment fails loudly and
// immediately (every /api/* call 502s against an unreachable localhost
// target) rather than silently -- see DEPLOYMENT.md's pre-deploy
// checklist for the actual enforcement.

const nextConfig = {
  // The development indicator is a clickable bottom-left overlay. Gridshot
  // uses the entire viewport as its aim surface, so the indicator must not
  // intercept movement or shots during local development.
  devIndicators: false,
  async rewrites() {
    // Development can point to the private API or the explicit local test mock.
    // Production is structurally forbidden from enabling the mock above.
    const apiTarget =
      process.env.API_URL ||
      (process.env.USE_MOCK_API
        ? "http://localhost:4100"
        : "http://localhost:4000");
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
