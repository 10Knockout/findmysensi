import type { MetadataRoute } from "next";
import { SITE_URL } from "../src/lib/site.js";

/**
 * Public marketing + tool + guide + leaderboard surface is crawlable.
 * The authenticated app, auth funnel, and per-ticket result pages carry no
 * standalone search value and are duplicated or session-bound, so they are
 * disallowed here and additionally `noindex` via route metadata.
 *
 * AI answer engines (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) are
 * intentionally left allowed — being quotable in those answers is a goal.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/app/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify",
    "/results/",
    "/api/",
  ];

  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
