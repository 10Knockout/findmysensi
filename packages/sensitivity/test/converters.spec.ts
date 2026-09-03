import { describe, expect, it } from "vitest";
import {
  aimlabsDefaultToFindMySensi,
  cmPer360ToSensitivity,
  convertSensitivity,
  findMySensiToAimlabsDefault,
  fmsToGameSensitivity,
  gameSensitivityToFms,
  getSensitivityProfile,
  sensitivityToCmPer360,
  VERIFIED_SENSITIVITY_PROFILE_IDS,
  type VerifiedSensitivityProfileId,
} from "../src/index.js";

interface GoldenVector {
  readonly source: VerifiedSensitivityProfileId;
  readonly target: VerifiedSensitivityProfileId;
  readonly values: readonly (readonly [number, number])[];
}

const GOLDEN_VECTORS: readonly GoldenVector[] = [
  {
    source: "valorant",
    target: "aimlab-default",
    values: [
      [0.05, 0.07],
      [0.125, 0.175],
      [0.8, 1.12],
    ],
  },
  {
    source: "aimlab-default",
    target: "valorant",
    values: [
      [0.07, 0.05],
      [0.175, 0.125],
      [1.12, 0.8],
    ],
  },
  {
    source: "valorant",
    target: "cs2",
    values: [
      [0.11, 0.35],
      [0.22, 0.7],
      [0.77, 2.45],
    ],
  },
  {
    source: "cs2",
    target: "valorant",
    values: [
      [0.35, 0.11],
      [0.7, 0.22],
      [2.45, 0.77],
    ],
  },
  {
    source: "valorant",
    target: "apex",
    values: [
      [0.11, 0.35],
      [0.22, 0.7],
      [0.77, 2.45],
    ],
  },
  {
    source: "apex",
    target: "valorant",
    values: [
      [0.35, 0.11],
      [0.7, 0.22],
      [2.45, 0.77],
    ],
  },
  {
    source: "cs2",
    target: "aimlab-default",
    values: [
      [0.5, 0.22],
      [1, 0.44],
      [3, 1.32],
    ],
  },
  {
    source: "aimlab-default",
    target: "cs2",
    values: [
      [0.22, 0.5],
      [0.44, 1],
      [1.32, 3],
    ],
  },
] as const;

describe("versioned sensitivity profiles", () => {
  it("marks the shipping linear profiles as cross-verified and versioned", () => {
    for (const id of VERIFIED_SENSITIVITY_PROFILE_IDS) {
      const profile = getSensitivityProfile(id);
      expect(profile.version).toBe(1);
      expect(profile.verificationLevel).toBe("cross-verified");
      expect(profile.conversionAvailability).toBe("available");
    }
  });

  it("does not claim exact PUBG support before its nonlinear curve is verified", () => {
    const pubg = getSensitivityProfile("pubg");
    expect(pubg.verificationLevel).toBe("experimental");
    expect(pubg.conversionAvailability).toBe("research-required");
    expect(() =>
      convertSensitivity({
        sourceGame: "pubg",
        sourceSensitivity: 50,
        sourceDpi: 800,
        targetGame: "aimlab-default",
        targetDpi: 800,
      }),
    ).toThrow(/experimental and unavailable/);
  });
});

describe("golden cross-game conversion matrix", () => {
  for (const vector of GOLDEN_VECTORS) {
    for (const [sourceSensitivity, targetSensitivity] of vector.values) {
      it(`${vector.source} ${sourceSensitivity} -> ${vector.target} ${targetSensitivity}`, () => {
        const result = convertSensitivity({
          sourceGame: vector.source,
          targetGame: vector.target,
          sourceSensitivity,
          sourceDpi: 800,
          targetDpi: 800,
        });
        expect(result.targetSensitivity).toBeCloseTo(targetSensitivity, 12);
      });
    }
  }

  it("passes the non-negotiable 2400-DPI personal golden vector exactly", () => {
    expect(
      convertSensitivity({
        sourceGame: "valorant",
        sourceSensitivity: 0.125,
        sourceDpi: 2400,
        targetGame: "aimlab-default",
        targetDpi: 2400,
      }).targetSensitivity,
    ).toEqual(0.175);
  });

  it("keeps the personal vector invariant from 800 through 3200 equal DPI", () => {
    for (const dpi of [400, 800, 1600, 2400, 3200]) {
      const result = convertSensitivity({
        sourceGame: "valorant",
        sourceSensitivity: 0.125,
        sourceDpi: dpi,
        targetGame: "aimlab-default",
        targetDpi: dpi,
      });
      expect(result.targetSensitivity).toEqual(0.175);
    }
  });

  it.each([
    [800, 1600, 0.154],
    [1600, 800, 0.616],
    [800, 2400, 0.10266666666666667],
    [2400, 800, 0.924],
  ])(
    "applies the physical DPI factor from %i to %i",
    (sourceDpi, targetDpi, expected) => {
      const result = convertSensitivity({
        sourceGame: "valorant",
        sourceSensitivity: 0.22,
        sourceDpi,
        targetGame: "aimlab-default",
        targetDpi,
      });
      expect(result.targetSensitivity).toBeCloseTo(expected, 12);
    },
  );
});

describe("physical metrics and identity", () => {
  it("matches the 800-DPI and 2400-DPI physical reference metrics", () => {
    const at800 = convertSensitivity({
      sourceGame: "valorant",
      sourceSensitivity: 0.125,
      sourceDpi: 800,
      targetGame: "aimlab-default",
      targetDpi: 800,
    });
    expect(at800.cmPer360).toBeCloseTo(130.63, 2);
    expect(at800.inPer360).toBeCloseTo(51.43, 2);
    expect(at800.sourceEdpi).toBe(100);
    expect(at800.targetEdpi).toBe(140);

    const at2400 = convertSensitivity({
      sourceGame: "valorant",
      sourceSensitivity: 0.125,
      sourceDpi: 2400,
      targetGame: "aimlab-default",
      targetDpi: 2400,
    });
    expect(at2400.cmPer360).toBeCloseTo(43.54, 2);
    expect(at2400.targetEdpi).toBe(420);
  });

  it("round-trips sensitivity and cm/360 without display rounding", () => {
    const originalSensitivity = 1.85;
    const cm = sensitivityToCmPer360("cs2", originalSensitivity, 800);
    expect(cmPer360ToSensitivity("cs2", cm, 800)).toBeCloseTo(
      originalSensitivity,
      12,
    );
  });

  it("uses an identity mapping between Aimlabs Default and FMS", () => {
    expect(aimlabsDefaultToFindMySensi(0.175)).toEqual(0.175);
    expect(findMySensiToAimlabsDefault(0.175)).toEqual(0.175);
    expect(gameSensitivityToFms("aimlab-default", 0.175)).toBe("0.175");
    expect(fmsToGameSensitivity("aimlab-default", "0.175")).toEqual(0.175);
  });

  it("keeps eDPI game-local rather than forcing cross-game equality", () => {
    const result = convertSensitivity({
      sourceGame: "valorant",
      sourceSensitivity: 0.125,
      sourceDpi: 2400,
      targetGame: "aimlab-default",
      targetDpi: 2400,
    });
    expect(result.sourceEdpi).toBe(300);
    expect(result.targetEdpi).toBe(420);
  });

  it("rejects invalid physical inputs", () => {
    expect(() => sensitivityToCmPer360("cs2", 0, 800)).toThrow(RangeError);
    expect(() => sensitivityToCmPer360("cs2", -1.5, 800)).toThrow(RangeError);
    expect(() => cmPer360ToSensitivity("cs2", -10, 800)).toThrow(RangeError);
    expect(() => sensitivityToCmPer360("cs2", 1, 0)).toThrow(RangeError);
  });
});

describe("strict verified-pair round trips", () => {
  for (const source of VERIFIED_SENSITIVITY_PROFILE_IDS) {
    for (const target of VERIFIED_SENSITIVITY_PROFILE_IDS) {
      if (source === target) continue;
      it(`${source} -> ${target} -> ${source}`, () => {
        for (const sensitivity of [0.125, 0.5, 1]) {
          const outbound = convertSensitivity({
            sourceGame: source,
            targetGame: target,
            sourceSensitivity: sensitivity,
            sourceDpi: 800,
            targetDpi: 2400,
          });
          const returned = convertSensitivity({
            sourceGame: target,
            targetGame: source,
            sourceSensitivity: outbound.exactTargetSensitivity,
            sourceDpi: 2400,
            targetDpi: 800,
          });
          expect(returned.targetSensitivity).toBeCloseTo(sensitivity, 12);
        }
      });
    }
  }
});
