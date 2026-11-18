import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("marketing home page", () => {
  it("keeps the chapter anchors for visitors arriving from public routes", () => {
    const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    for (const chapter of [
      "training",
      "guest-play",
      "calibration",
      "leaderboard",
    ]) {
      expect(page).toContain(`id="${chapter}"`);
    }
  });

  it("keeps the landing style safeguards", () => {
    const styles = readFileSync(
      new URL("./globals.css", import.meta.url),
      "utf8",
    );

    expect(styles).toContain("content-visibility: auto");
    expect(styles).toContain("prefers-reduced-motion");
    expect(styles).not.toContain("backdrop-filter");
  });
});
