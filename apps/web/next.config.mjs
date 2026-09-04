/** @type {import('next').NextConfig} */
if (process.env.NODE_ENV === "production" && process.env.USE_MOCK_API) {
  throw new Error("USE_MOCK_API must never be enabled in production.");
}

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
