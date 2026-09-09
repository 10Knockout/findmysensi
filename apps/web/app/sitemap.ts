import type { MetadataRoute } from "next";
import { SITE_URL } from "../src/lib/site.js";
import { GUIDES } from "../src/features/guides/registry.js";

/**
 * The intended public, indexable surface. Authenticated (`/app/*`) and auth
 * routes are deliberately absent — see `app/robots.ts`. The `/train/*` and
 * `/tools/{crosshair,sensi-lab}` routes are omitted because they only issue a
 * server redirect into the authenticated app and have no standalone content.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/tools/converter`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/tools/mouse-swap`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/leaderboards`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/guides`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  const guides: MetadataRoute.Sitemap = GUIDES.map((guide) => ({
    url: `${SITE_URL}/guides/${guide.slug}`,
    lastModified: new Date(guide.updated),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...core, ...guides];
}
