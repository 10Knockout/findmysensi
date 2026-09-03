import { describe, it, expect } from "vitest";
import {
  convertSensitivity,
  sensitivityToCmPer360,
  cmPer360ToSensitivity,
  gameSensitivityToFms,
  fmsToGameSensitivity,
} from "../src/index.js";

describe("Sensitivity Converters (@findmysensi/sensitivity)", () => {
  it("converts CS2 (Source) sensitivity to Valorant accurately", () => {
    // 2.0 sens @ 800 DPI in CS2:
    // CS2 yaw = 0.022 -> yaw/count = 0.044
    // Valorant yaw = 0.07 -> sens = 0.044 / 0.07 = 0.628571...
    const result = convertSensitivity({
      sourceGame: "cs2",
      targetGame: "valorant",
      sourceSensitivity: 2.0,
      sourceDpi: 800,
      targetDpi: 800,
    });

    expect(result.targetSensitivity).toBeCloseTo(0.628571, 4);
    expect(result.cmPer360).toBeCloseTo(25.98, 1);
  });

  it("converts Valorant to Overwatch 2 accurately", () => {
    // 0.5 sens @ 800 DPI in Valorant:
    // Valorant yaw/count = 0.035 deg
    // Overwatch yaw = 0.0066 -> sens = 0.035 / 0.0066 = 5.30303...
    const result = convertSensitivity({
      sourceGame: "valorant",
      targetGame: "overwatch2",
      sourceSensitivity: 0.5,
      sourceDpi: 800,
      targetDpi: 800,
    });

    expect(result.targetSensitivity).toBeCloseTo(5.303, 2);
  });

  it("handles DPI conversion factor correctly", () => {
    // 2.0 sens @ 400 DPI in CS2 converted to 800 DPI in CS2 should be 1.0 sens
    const result = convertSensitivity({
      sourceGame: "cs2",
      targetGame: "cs2",
      sourceSensitivity: 2.0,
      sourceDpi: 400,
      targetDpi: 800,
    });

    expect(result.targetSensitivity).toBeCloseTo(1.0, 4);
  });

  it("roundtrips sensitivity <-> cm/360 without loss", () => {
    const originalSens = 1.85;
    const cm = sensitivityToCmPer360("cs2", originalSens, 800);
    const recoveredSens = cmPer360ToSensitivity("cs2", cm, 800);

    expect(recoveredSens).toBeCloseTo(originalSens, 6);
  });

  it("throws RangeError on negative or zero sensitivity/DPI", () => {
    expect(() => sensitivityToCmPer360("cs2", 0, 800)).toThrow(RangeError);
    expect(() => sensitivityToCmPer360("cs2", -1.5, 800)).toThrow(RangeError);
    expect(() => cmPer360ToSensitivity("cs2", -10, 800)).toThrow(RangeError);
  });

  it("converts game sensitivity to FMS gain and roundtrips accurately", () => {
    const valorantSens = 0.35;
    const fms = gameSensitivityToFms("valorant", valorantSens);
    expect(parseFloat(fms)).toBeGreaterThan(0);

    const recovered = fmsToGameSensitivity("valorant", fms);
    expect(recovered).toBeCloseTo(valorantSens, 3);
  });
});
