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

  it("enables the four completed click modes", () => {
    expect(isTrainerModeEnabled("grid")).toBe(true);
    expect(isTrainerModeEnabled("pinpoint")).toBe(true);
    expect(isTrainerModeEnabled("multi")).toBe(true);
    expect(isTrainerModeEnabled("headline")).toBe(true);
    expect(isTrainerModeEnabled("strafe")).toBe(false);
    expect(isTrainerModeEnabled("smooth-track")).toBe(false);
    expect(isTrainerModeEnabled("tempo")).toBe(false);
  });

  it("returns false for an unknown mode id rather than throwing", () => {
    expect(isTrainerModeEnabled("not-a-real-mode")).toBe(false);
  });

  it.each(["grid", "pinpoint", "multi", "headline"])(
    "%s carries an adapter factory",
    (modeId) => {
      expect(typeof trainerModeManifest.get(modeId)?.createAdapter).toBe(
        "function",
      );
    },
  );

  it.each(["strafe", "smooth-track", "tempo"])(
    "%s stays disabled without an adapter factory",
    (modeId) => {
      expect(trainerModeManifest.get(modeId)?.createAdapter).toBeUndefined();
    },
  );
});
