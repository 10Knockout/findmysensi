import { describe, expect, it } from "vitest";
import {
  CANONICAL_HALF_HFOV_UNITS,
  CANONICAL_HALF_VFOV_UNITS,
  clampPitchToBounds,
  clampYawToBounds,
  DEFAULT_MAX_PITCH_UNITS,
  FULL_TURN_UNITS,
  resolveCameraBounds,
  wrapYaw,
} from "../src/index.js";

const GRID_WIDTH = 1_200_000;
const GRID_HEIGHT = 720_000;

function toDegrees(units: number): number {
  return (units / FULL_TURN_UNITS) * 360;
}

describe("resolveCameraBounds", () => {
  it("adds half of the canonical FOV to the spawn-area half-extent", () => {
    const bounds = resolveCameraBounds(GRID_WIDTH, GRID_HEIGHT);

    expect(bounds.maxYawUnits).toBe(GRID_WIDTH / 2 + CANONICAL_HALF_HFOV_UNITS);
    expect(bounds.maxPitchUnits).toBe(
      GRID_HEIGHT / 2 + CANONICAL_HALF_VFOV_UNITS,
    );
  });

  it("keeps Gridshot's vertical limit far below the 89.9 degree gimbal clamp", () => {
    const bounds = resolveCameraBounds(GRID_WIDTH, GRID_HEIGHT);

    expect(toDegrees(bounds.maxPitchUnits)).toBeCloseTo(42.99, 1);
    expect(bounds.maxPitchUnits).toBeLessThan(DEFAULT_MAX_PITCH_UNITS);
  });

  it("never exceeds the gimbal clamp even for an absurdly tall spawn area", () => {
    const bounds = resolveCameraBounds(GRID_WIDTH, FULL_TURN_UNITS / 2);

    expect(bounds.maxPitchUnits).toBe(DEFAULT_MAX_PITCH_UNITS);
  });

  it("rejects non-integer or negative spawn areas", () => {
    expect(() => resolveCameraBounds(1.5, GRID_HEIGHT)).toThrow(RangeError);
    expect(() => resolveCameraBounds(GRID_WIDTH, -1)).toThrow(RangeError);
  });
});

describe("clampPitchToBounds", () => {
  it("stops downward travel at the play-area limit, not at 89.9 degrees", () => {
    const bounds = resolveCameraBounds(GRID_WIDTH, GRID_HEIGHT);
    const clamped = clampPitchToBounds(-DEFAULT_MAX_PITCH_UNITS, bounds);

    expect(clamped).toBe(-bounds.maxPitchUnits);
  });

  it("leaves in-range pitch untouched", () => {
    const bounds = resolveCameraBounds(GRID_WIDTH, GRID_HEIGHT);

    expect(clampPitchToBounds(100_000, bounds)).toBe(100_000);
    expect(clampPitchToBounds(-100_000, bounds)).toBe(-100_000);
  });
});

describe("clampYawToBounds", () => {
  it("clamps yaw symmetrically around the play area in wrapped space", () => {
    const bounds = resolveCameraBounds(GRID_WIDTH, GRID_HEIGHT);

    // A yaw far to the right of the play area clamps to the positive limit.
    const right = clampYawToBounds(
      wrapYaw(bounds.maxYawUnits + 500_000),
      bounds,
    );
    expect(right).toBe(wrapYaw(bounds.maxYawUnits));

    // A yaw far to the left (stored wrapped, i.e. near FULL_TURN) clamps to
    // the negative limit rather than being treated as a huge positive angle.
    const left = clampYawToBounds(
      wrapYaw(-bounds.maxYawUnits - 500_000),
      bounds,
    );
    expect(left).toBe(wrapYaw(-bounds.maxYawUnits));
  });

  it("leaves yaw inside the play area untouched", () => {
    const bounds = resolveCameraBounds(GRID_WIDTH, GRID_HEIGHT);

    expect(clampYawToBounds(wrapYaw(200_000), bounds)).toBe(wrapYaw(200_000));
    expect(clampYawToBounds(wrapYaw(-200_000), bounds)).toBe(wrapYaw(-200_000));
    expect(clampYawToBounds(wrapYaw(0), bounds)).toBe(0);
  });
});
