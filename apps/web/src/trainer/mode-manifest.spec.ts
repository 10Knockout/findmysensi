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
      "microshot",
      "reaction",
      "switch-track",
      "anchor-flick",
      "motion-flick",
      "turn180",
    ];
    for (const id of ids) {
      expect(trainerModeManifest.has(id)).toBe(true);
    }
  });

  it("enables every completed practice mode", () => {
    expect(isTrainerModeEnabled("grid")).toBe(true);
    expect(isTrainerModeEnabled("pinpoint")).toBe(true);
    expect(isTrainerModeEnabled("multi")).toBe(true);
    expect(isTrainerModeEnabled("headline")).toBe(true);
    expect(isTrainerModeEnabled("strafe")).toBe(true);
    expect(isTrainerModeEnabled("smooth-track")).toBe(true);
    expect(isTrainerModeEnabled("microshot")).toBe(true);
    expect(isTrainerModeEnabled("reaction")).toBe(true);
    expect(isTrainerModeEnabled("switch-track")).toBe(true);
    expect(isTrainerModeEnabled("anchor-flick")).toBe(true);
    expect(isTrainerModeEnabled("motion-flick")).toBe(true);
    expect(isTrainerModeEnabled("turn180")).toBe(true);
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
    "microshot",
    "reaction",
    "switch-track",
    "anchor-flick",
    "motion-flick",
    "turn180",
  ])("%s carries an adapter factory", (modeId) => {
    expect(typeof trainerModeManifest.get(modeId)?.createAdapter).toBe(
      "function",
    );
  });
});
