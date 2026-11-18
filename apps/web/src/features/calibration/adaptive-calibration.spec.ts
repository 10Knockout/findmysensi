import { describe, expect, it } from "vitest";
import {
  ACTIVE_SECONDS,
  COMPARISONS,
  COUNTDOWN_SECONDS,
  buildPair,
  comparePair,
  isBrowserSensitivity,
  parseSensitivityInput,
} from "./adaptive-calibration.js";

const seed = [1, 2, 3, 4] as const;

describe("short calibration", () => {
  it("fits the drill plan and countdowns within three minutes", () => {
    expect(COMPARISONS.map(({ mode }) => mode)).toEqual([
      "grid",
      "headline",
      "strafe",
      "multi",
      "reaction",
      "microshot",
      "microshot",
    ]);
    expect(ACTIVE_SECONDS + COMPARISONS.length * 2 * COUNTDOWN_SECONDS).toBe(
      168,
    );
  });

  it("moves toward a clear winner and fine-tunes around the incumbent", () => {
    const pair = buildPair(0, 0.25, 1, true, seed);
    expect(pair.candidates).toEqual([0.1375, 0.3625]);
    const win = comparePair(
      pair,
      { sensitivity: pair.candidates[0], score: 200, strafeOnTarget: null },
      { sensitivity: pair.candidates[1], score: 100, strafeOnTarget: null },
    );
    expect(win).toMatchObject({
      preferred: 0.1375,
      direction: -1,
      decisive: true,
    });
    expect(
      buildPair(6, win.preferred, win.direction, false, seed).candidates,
    ).toEqual([0.1375, 0.1275]);
  });

  it("keeps the incumbent when low tracking scores are too close", () => {
    const pair = buildPair(2, 0.25, 1, true, seed);
    expect(
      comparePair(
        pair,
        { sensitivity: pair.candidates[0], score: 24, strafeOnTarget: 24 },
        { sensitivity: pair.candidates[1], score: 27, strafeOnTarget: 27 },
      ),
    ).toMatchObject({ preferred: 0.25, decisive: false, strafeOnTarget: 27 });
  });

  it("chooses distinct valid settings at either endpoint", () => {
    for (const base of [0.000001, 100]) {
      for (const i of COMPARISONS.keys()) {
        for (const direction of [-1, 1] as const) {
          const pair = buildPair(i, base, direction, true, seed);
          expect(pair.candidates.every(isBrowserSensitivity)).toBe(true);
          expect(pair.candidates[0]).toBeLessThan(pair.candidates[1]);
        }
      }
    }
    expect(parseSensitivityInput(".125")).toBe(0.125);
    expect(parseSensitivityInput("0.")).toBeNull();
  });
});
