import { describe, expect, it } from "vitest";
import { isTrainerModeEnabled, trainerModeManifest } from "./mode-manifest.js";

describe("Trainer mode manifest", () => {
  it("has an entry for every registered scenario mode", () => {
    const ids = [
      "grid",
      "pinpoint",
      "multi",
      "headline",
      "strafe",
      "smooth-track",
      "tempo",
    ];
    for (const id of ids) {
      expect(trainerModeManifest.has(id)).toBe(true);
    }
  });

  it("enables all seven completed practice modes", () => {
    expect(isTrainerModeEnabled("grid")).toBe(true);
    expect(isTrainerModeEnabled("pinpoint")).toBe(true);
    expect(isTrainerModeEnabled("multi")).toBe(true);
    expect(isTrainerModeEnabled("headline")).toBe(true);
    expect(isTrainerModeEnabled("strafe")).toBe(true);
    expect(isTrainerModeEnabled("smooth-track")).toBe(true);
    expect(isTrainerModeEnabled("tempo")).toBe(true);
  });

  it("returns false for an unknown mode id rather than throwing", () => {
    expect(isTrainerModeEnabled("not-a-real-mode")).toBe(false);
  });

  it.each([
    "grid",
    "pinpoint",
    "multi",
    "headline",
    "strafe",
    "smooth-track",
    "tempo",
  ])("%s carries an adapter factory", (modeId) => {
    expect(typeof trainerModeManifest.get(modeId)?.createAdapter).toBe(
      "function",
    );
  });
});
