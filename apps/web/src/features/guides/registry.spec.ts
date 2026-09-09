import { describe, it, expect } from "vitest";
import { GUIDES } from "./registry.js";
import { GUIDE_CONTENT } from "./content.js";

describe("guide registry", () => {
  it("has body content for every registered guide and vice versa", () => {
    const registrySlugs = [...GUIDES.map((g) => g.slug)].sort();
    const contentSlugs = Object.keys(GUIDE_CONTENT).sort();
    expect(contentSlugs).toEqual(registrySlugs);
  });

  it("uses unique slugs", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("keeps meta descriptions within a sensible length for SERP snippets", () => {
    for (const guide of GUIDES) {
      expect(guide.description.length).toBeGreaterThanOrEqual(80);
      expect(guide.description.length).toBeLessThanOrEqual(170);
    }
  });
});
