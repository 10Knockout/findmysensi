/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // In development, proxy relative /api/* requests to backend or mock
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
