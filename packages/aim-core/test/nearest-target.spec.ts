import { describe, expect, it } from "vitest";
import { createAngleUnits, createPitchUnits } from "../src/fixed/angle.js";
import { findNearestTarget } from "../src/collision/target.js";

describe("findNearestTarget", () => {
  it("returns the closest target by angular distance, with its signed delta", () => {
    const targets = [
      {
        id: 1,
        xAngleUnits: 100_000,
        yAngleUnits: 50_000,
        radiusAngleUnits: 25_000,
      },
      { id: 2, xAngleUnits: 500_000, yAngleUnits: 0, radiusAngleUnits: 25_000 },
    ];

    const result = findNearestTarget(
      createAngleUnits(90_000),
      createPitchUnits(50_000),
      targets,
    );

    expect(result?.target.id).toBe(1);
    expect(result?.dx).toBe(10_000);
    expect(result?.dy).toBe(0);
  });

  it("returns null for an empty target list", () => {
    expect(
      findNearestTarget(createAngleUnits(0), createPitchUnits(0), []),
    ).toBeNull();
  });

  it("uses shortest-path yaw distance across the wrap seam", () => {
    const targets = [
      { id: 1, xAngleUnits: 5_000, yAngleUnits: 0, radiusAngleUnits: 20_000 },
    ];
    // Aim just past the wrap seam (FULL_TURN_UNITS - 10_000); the shortest
    // path to xAngleUnits=5_000 is +15_000, not a huge unwrapped distance.
    const result = findNearestTarget(
      createAngleUnits(16_777_216 - 10_000),
      createPitchUnits(0),
      targets,
    );
    expect(result?.dx).toBe(15_000);
  });
});
