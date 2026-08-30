import { describe, expect, it } from "vitest";
import {
  FULL_TURN_UNITS,
  HALF_TURN_UNITS,
  QUARTER_TURN_UNITS,
  addAngle,
  angleDeltaUnitsToDegrees,
  angleUnitsToDegrees,
  createAngleDeltaUnits,
  createAngleUnits,
  degreesToAngleDeltaUnits,
  degreesToAngleUnits,
  wrapYaw,
} from "../src/fixed/angle.js";
import {
  clampPitch,
  DEFAULT_MAX_PITCH_UNITS,
  DEFAULT_MIN_PITCH_UNITS,
} from "../src/fixed/range.js";

describe("Deterministic Fixed-Angle Representation", () => {
  describe("Constants", () => {
    it("defines exact 24-bit fixed turn constants", () => {
      expect(FULL_TURN_UNITS).toBe(16777216);
      expect(HALF_TURN_UNITS).toBe(8388608);
      expect(QUARTER_TURN_UNITS).toBe(4194304);
    });
  });

  describe("wrapYaw", () => {
    it("wraps integer values into [0, FULL_TURN_UNITS - 1]", () => {
      expect(wrapYaw(0)).toBe(0);
      expect(wrapYaw(100)).toBe(100);
      expect(wrapYaw(FULL_TURN_UNITS - 1)).toBe(FULL_TURN_UNITS - 1);
      expect(wrapYaw(FULL_TURN_UNITS)).toBe(0);
      expect(wrapYaw(FULL_TURN_UNITS + 500)).toBe(500);

      // Negative values wrap from top
      expect(wrapYaw(-1)).toBe(FULL_TURN_UNITS - 1);
      expect(wrapYaw(-FULL_TURN_UNITS)).toBe(0);
      expect(wrapYaw(-FULL_TURN_UNITS - 10)).toBe(FULL_TURN_UNITS - 10);
      expect(wrapYaw(-167772160)).toBe(0); // -10 full turns
    });

    it("rejects non-integer and non-safe values", () => {
      expect(() => wrapYaw(1.5)).toThrow(RangeError);
      expect(() => wrapYaw(NaN)).toThrow(RangeError);
      expect(() => wrapYaw(Infinity)).toThrow(RangeError);
      expect(() => wrapYaw(-Infinity)).toThrow(RangeError);
      expect(() => wrapYaw(Number.MAX_SAFE_INTEGER + 10)).toThrow(RangeError);
    });
  });

  describe("addAngle", () => {
    it("adds base angle and signed delta correctly with wrapping", () => {
      const base = createAngleUnits(1000);
      const posDelta = createAngleDeltaUnits(500);
      const negDelta = createAngleDeltaUnits(-1500);

      expect(addAngle(base, posDelta)).toBe(1500);
      expect(addAngle(base, negDelta)).toBe(FULL_TURN_UNITS - 500);
    });
  });

  describe("clampPitch", () => {
    it("clamps pitch to default valid field without gimbal lock", () => {
      expect(clampPitch(0)).toBe(0);
      expect(clampPitch(1000)).toBe(1000);
      expect(clampPitch(-1000)).toBe(-1000);

      // Exceeding bounds clamps strictly to limit
      expect(clampPitch(FULL_TURN_UNITS)).toBe(DEFAULT_MAX_PITCH_UNITS);
      expect(clampPitch(-FULL_TURN_UNITS)).toBe(DEFAULT_MIN_PITCH_UNITS);
    });

    it("clamps pitch to custom bounds", () => {
      expect(clampPitch(500, -100, 100)).toBe(100);
      expect(clampPitch(-500, -100, 100)).toBe(-100);
      expect(clampPitch(50, -100, 100)).toBe(50);
    });

    it("rejects non-integers in pitch calculation", () => {
      expect(() => clampPitch(0.25)).toThrow(RangeError);
      expect(() => clampPitch(NaN)).toThrow(RangeError);
    });
  });

  describe("Degree Conversions (Presentation Boundary Only)", () => {
    it("converts degrees to angle units and back with sub-arcsecond precision", () => {
      expect(degreesToAngleUnits(0)).toBe(0);
      expect(degreesToAngleUnits(360)).toBe(0);
      expect(degreesToAngleUnits(180)).toBe(HALF_TURN_UNITS);
      expect(degreesToAngleUnits(90)).toBe(QUARTER_TURN_UNITS);

      expect(angleUnitsToDegrees(createAngleUnits(0))).toBe(0);
      expect(angleUnitsToDegrees(createAngleUnits(HALF_TURN_UNITS))).toBe(180);
      expect(angleUnitsToDegrees(createAngleUnits(QUARTER_TURN_UNITS))).toBe(
        90,
      );

      const deltaUnits = degreesToAngleDeltaUnits(-45);
      expect(deltaUnits).toBe(-QUARTER_TURN_UNITS / 2);
      expect(angleDeltaUnitsToDegrees(deltaUnits)).toBe(-45);
    });
  });
});
