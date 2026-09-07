import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("trainer dashboard catalog", () => {
  it("links all ten exercise routes", () => {
    const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    for (const modeId of [
      "grid",
      "pinpoint",
      "multi",
      "headline",
      "strafe",
      "smooth-track",
      "microshot",
      "reaction",
      "switch-track",
      "anchor-flick",
      "motion-flick",
      "turn180",
    ]) {
      expect(source).toContain(`"${modeId}",`);
    }
    expect(source).not.toContain("only exposed mode");
  });
});
