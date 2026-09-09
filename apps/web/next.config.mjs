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

// Next's App Router injects an inline bootstrap <script> and inline styles, so
// 'unsafe-inline' is required on script-src and style-src until a nonce-based
// policy is wired through. Browser API calls all go to same-origin /api/*
// (proxied server-side by the rewrite above), so connect-src stays 'self'.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
].join("; ");

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
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
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
