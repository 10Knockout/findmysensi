import { FULL_TURN_UNITS } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  BROWSER_GAIN_FIXED_POINT_SCALE,
  createBrowserInputScaler,
  DEFAULT_BROWSER_INPUT_GAIN,
  resolveBrowserInputGain,
} from "../src/browser-gain.js";

describe("Aimlabs-default-native browser gain", () => {
  it("derives sensitivity 1.0 from exactly 0.05 degrees per raw count", () => {
    const gain = resolveBrowserInputGain(null);
    expect(gain).toEqual(DEFAULT_BROWSER_INPUT_GAIN);
    expect(gain.degreesPerInputUnit).toBe(0.05);
    expect(gain.fixedPointAngleUnitsPerInputUnit).toBe(2_443_359_173);
    expect(
      gain.fixedPointAngleUnitsPerInputUnit / BROWSER_GAIN_FIXED_POINT_SCALE,
    ).toBeCloseTo(FULL_TURN_UNITS / 7200, 6);
  });

  it("precomputes decimal sensitivities deterministically", () => {
    expect(
      resolveBrowserInputGain("0.175").fixedPointAngleUnitsPerInputUnit,
    ).toBe(427_587_855);
    expect(
      resolveBrowserInputGain("0.5").fixedPointAngleUnitsPerInputUnit,
    ).toBe(1_221_679_586);
    expect(
      resolveBrowserInputGain("1.5").fixedPointAngleUnitsPerInputUnit,
    ).toBe(3_665_038_759);
  });

  it("preserves residuals without systematic truncation", () => {
    const scaler = createBrowserInputScaler(resolveBrowserInputGain("1"));
    let accumulated = 0;
    for (let count = 0; count < 7200; count++) {
      accumulated += scaler.scaleYaw(1);
    }
    expect(accumulated).toBe(FULL_TURN_UNITS);
    expect(Math.abs(scaler.getResiduals().yaw)).toBeLessThan(
      BROWSER_GAIN_FIXED_POINT_SCALE,
    );
  });

  it("gives yaw and pitch equivalent precision with independent residuals", () => {
    const scaler = createBrowserInputScaler(resolveBrowserInputGain("0.175"));
    let yaw = 0;
    let pitch = 0;
    for (let count = 0; count < 10_000; count++) {
      yaw += scaler.scaleYaw(1);
      pitch += scaler.scalePitch(1);
    }
    expect(yaw).toBe(pitch);
    expect(scaler.getResiduals().yaw).toBe(scaler.getResiduals().pitch);
  });

  it("cancels opposing motion and resets both residuals", () => {
    const scaler = createBrowserInputScaler(resolveBrowserInputGain("0.175"));
    expect(scaler.scaleYaw(1) + scaler.scaleYaw(-1)).toBe(0);
    scaler.scalePitch(1);
    scaler.reset();
    expect(scaler.getResiduals()).toEqual({ yaw: 0, pitch: 0 });
  });

  it("rejects zero, malformed, and unsafe runtime values", () => {
    expect(() => resolveBrowserInputGain("0")).toThrow(RangeError);
    expect(() => resolveBrowserInputGain("abc")).toThrow(RangeError);
    expect(() => resolveBrowserInputGain("100.01")).toThrow(RangeError);
  });
});
