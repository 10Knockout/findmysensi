import { describe, it, expect } from "vitest";
import {
  DEFAULT_BROWSER_INPUT_CALIBRATION,
  DEFAULT_BROWSER_INPUT_CALIBRATION_SCALE,
  IDENTITY_BROWSER_INPUT_CALIBRATION,
  applyBrowserInputCalibration,
  removeBrowserInputCalibration,
  resolveBrowserInputCalibration,
  gameSensitivityToFms,
  runtimeFmsToGameSensitivity,
} from "../src/index.js";

describe("Browser input calibration (@findmysensi/sensitivity)", () => {
  it("uses the measured Chrome + Windows default of 1.4", () => {
    expect(DEFAULT_BROWSER_INPUT_CALIBRATION_SCALE).toBe(1.4);
    expect(DEFAULT_BROWSER_INPUT_CALIBRATION.scale).toBe(1.4);
    expect(DEFAULT_BROWSER_INPUT_CALIBRATION.source).toBe("default");
  });

  it("maps the canonical Valorant 0.125 result (0.175) onto typed 0.245", () => {
    const canonical = Number(gameSensitivityToFms("valorant", "0.125"));
    expect(canonical).toBeCloseTo(0.175, 6);
    expect(applyBrowserInputCalibration(canonical)).toBe(0.245);
  });

  it("maps Aimlabs Default 0.175 onto typed 0.245 as well", () => {
    const canonical = Number(gameSensitivityToFms("aimlab-default", "0.175"));
    expect(applyBrowserInputCalibration(canonical)).toBe(0.245);
  });

  it.each([
    ["valorant", 0.125],
    ["cs2", 0.397727272727],
    ["apex", 0.397727272727],
    ["aimlab-default", 0.175],
  ] as const)(
    "converts browser runtime back into %s without changing calibration math",
    (gameId, gameSensitivity) => {
      const outgoing = runtimeFmsToGameSensitivity(gameId, 0.245, 800);
      expect(outgoing.canonicalFmsSensitivity).toBe(0.175);
      expect(outgoing.conversion.targetSensitivity).toBeCloseTo(
        gameSensitivity,
        6,
      );
    },
  );

  it("does not leak the browser multiplier into a displayed game result", () => {
    const result = runtimeFmsToGameSensitivity("valorant", 0.245, 2400);
    expect(result.canonicalFmsSensitivity).toBe(0.175);
    expect(result.conversion.targetSensitivity).toBe(0.125);
    expect(result.conversion.cmPer360).toBeCloseTo(43.54, 2);
  });

  it("applies the same factor to CS2 and Apex canonical results", () => {
    for (const game of ["cs2", "apex"] as const) {
      const canonical = Number(gameSensitivityToFms(game, "1"));
      expect(applyBrowserInputCalibration(canonical)).toBeCloseTo(
        canonical * 1.4,
        6,
      );
    }
  });

  it("round-trips apply then remove", () => {
    expect(
      removeBrowserInputCalibration(applyBrowserInputCalibration(0.5)),
    ).toBeCloseTo(0.5, 6);
  });

  it("identity calibration leaves the canonical value unchanged", () => {
    expect(
      applyBrowserInputCalibration(0.175, IDENTITY_BROWSER_INPUT_CALIBRATION),
    ).toBe(0.175);
  });

  it("accepts a bare number as a measured scale", () => {
    const resolved = resolveBrowserInputCalibration(1.6);
    expect(resolved.scale).toBe(1.6);
    expect(resolved.source).toBe("measured");
    expect(applyBrowserInputCalibration(0.175, 1.6)).toBe(0.28);
  });

  it("falls back to the default for null or undefined", () => {
    expect(resolveBrowserInputCalibration(null)).toEqual(
      DEFAULT_BROWSER_INPUT_CALIBRATION,
    );
    expect(resolveBrowserInputCalibration(undefined).scale).toBe(1.4);
  });

  it("rejects a scale outside the trusted 0.25 - 4 range", () => {
    expect(() => resolveBrowserInputCalibration(0.1)).toThrow(RangeError);
    expect(() => resolveBrowserInputCalibration(9)).toThrow(RangeError);
    expect(() => resolveBrowserInputCalibration(0)).toThrow(RangeError);
    expect(() => resolveBrowserInputCalibration(-2)).toThrow(RangeError);
  });

  it("rejects a non-positive canonical sensitivity", () => {
    expect(() => applyBrowserInputCalibration(0)).toThrow(RangeError);
    expect(() => applyBrowserInputCalibration(-1)).toThrow(RangeError);
    expect(() => applyBrowserInputCalibration(Number.NaN)).toThrow(RangeError);
  });
});
