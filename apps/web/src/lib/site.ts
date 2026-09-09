/**
 * Canonical site identity. Every SEO surface (metadata, sitemap, robots,
 * JSON-LD, Open Graph) reads from here so there is exactly one source of the
 * production origin. Override per environment with `NEXT_PUBLIC_SITE_URL`
 * (e.g. a Vercel preview deployment) — it must be an absolute origin with no
 * trailing slash.
 */
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const SITE_URL = (
  rawSiteUrl && rawSiteUrl.length > 0 ? rawSiteUrl : "https://findmysensi.com"
).replace(/\/$/, "");

export const SITE_NAME = "FindMySensi";

export const SITE_TAGLINE =
  "Free browser aim trainer and sensitivity matching engine";

export const SITE_DESCRIPTION =
  "FindMySensi is a free, open-source aim trainer that runs in your browser. " +
  "Twelve deterministic drills, a physically accurate sensitivity converter " +
  "(cm/360, eDPI, angular gain), blinded calibration, and public per-mode " +
  "leaderboards — no download, no account required to start.";

export const GITHUB_URL = "https://github.com/10Knockout/findmysensi";

export const AUTHOR_NAME = "Hitesh Mahay";
export const AUTHOR_URL = "https://hiteshmahay.com";

/** Absolute URL helper for structured data and canonical tags. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

/**
 * Drop-in `metadata` for route segments that must never appear in search:
 * the authenticated app, the auth funnel, and per-ticket result pages. Keeps
 * these out of the index even when a crawler reaches them via an external link
 * (which a `robots.txt` disallow alone does not prevent).
 */
export const noindexMetadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
} as const;
