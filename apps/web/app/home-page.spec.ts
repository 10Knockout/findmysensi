import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("marketing home page", () => {
  it("keeps the single-page chapters and low-power motion safeguards", () => {
    const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    const styles = readFileSync(
      new URL("./globals.css", import.meta.url),
      "utf8",
    );

    expect(page).toContain('id="training"');
    expect(page).toContain('id="calibration"');
    expect(page).toContain('id="leaderboard"');
    expect(page).toContain('fetchPriority="high"');
    expect(styles).toContain("content-visibility: auto");
    expect(styles).toContain("prefers-reduced-motion");
    expect(styles).not.toContain("backdrop-filter");
  });
});
