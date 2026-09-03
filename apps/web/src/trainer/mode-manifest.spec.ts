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

  it("enables only grid; every other mode is present but disabled", () => {
    expect(isTrainerModeEnabled("grid")).toBe(true);
    expect(isTrainerModeEnabled("pinpoint")).toBe(false);
    expect(isTrainerModeEnabled("multi")).toBe(false);
    expect(isTrainerModeEnabled("headline")).toBe(false);
    expect(isTrainerModeEnabled("strafe")).toBe(false);
    expect(isTrainerModeEnabled("smooth-track")).toBe(false);
    expect(isTrainerModeEnabled("tempo")).toBe(false);
  });

  it("returns false for an unknown mode id rather than throwing", () => {
    expect(isTrainerModeEnabled("not-a-real-mode")).toBe(false);
  });

  it("only grid carries an adapter factory", () => {
    expect(typeof trainerModeManifest.get("grid")?.createAdapter).toBe(
      "function",
    );
    expect(trainerModeManifest.get("pinpoint")?.createAdapter).toBeUndefined();
  });
});
