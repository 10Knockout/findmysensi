/**
 * Guide index. One entry per `/guides/<slug>` route. The array is the single
 * source consumed by the guides hub page and by `app/sitemap.ts`, so adding a
 * guide route means adding it here too (a test guards that they stay in sync).
 */
export interface GuideMeta {
  slug: string;
  title: string;
  /** ~120-160 chars, used verbatim as the meta description. */
  description: string;
  /** Short label for the hub card. */
  summary: string;
  /** ISO date, drives `lastModified` in the sitemap and `dateModified` in JSON-LD. */
  updated: string;
  /** Primary search theme this URL owns. Keep one theme per guide. */
  keyword: string;
}

export const GUIDES: readonly GuideMeta[] = [
  {
    slug: "cm-per-360-explained",
    title: "cm/360 Explained: The Only Sensitivity Number That Transfers",
    description:
      "cm/360 is how far you physically move your mouse to turn a full circle. Learn why it, not in-game sensitivity, is the number that carries between games.",
    summary:
      "What cm/360 means, how it relates to DPI and eDPI, and why it is the unit every conversion should preserve.",
    updated: "2026-09-10",
    keyword: "cm/360 sensitivity",
  },
  {
    slug: "valorant-to-cs2-sensitivity",
    title: "Valorant to CS2 Sensitivity: Exact Conversion + Why It Works",
    description:
      "Convert your Valorant sensitivity to CS2 the correct way. CS2 sens = Valorant sens x 3.18 at the same DPI, and here is the math and the pitfalls behind it.",
    summary:
      "The 3.18 multiplier, worked examples at common DPI values, and the ADS / zoom caveats most converters ignore.",
    updated: "2026-09-10",
    keyword: "valorant to cs2 sensitivity",
  },
  {
    slug: "how-to-find-your-sensitivity",
    title: "How to Find Your Ideal Mouse Sensitivity for Aiming",
    description:
      "A repeatable method for finding a mouse sensitivity that fits your aim: pick a cm/360 range, test it blind, measure, and adjust in small steps.",
    summary:
      "A step-by-step process to settle on a sensitivity with evidence instead of guesswork, using blinded test blocks.",
    updated: "2026-09-10",
    keyword: "how to find your sensitivity",
  },
] as const;

export function getGuide(slug: string): GuideMeta | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
