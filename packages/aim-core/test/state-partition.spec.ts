import { describe, it, expect } from "vitest";
import {
  testAngularHit,
  TargetCollisionGeometry,
} from "../src/collision/target.js";
import { createAngleUnits } from "../src/fixed/angle.js";

describe("State Partitioning and Bounds", () => {
  it("should prove spatial partitioning doesn't change hit scores", () => {
    // If a target is perfectly on the edge, the bounds check must be exactly the same
    // regardless of what spatial chunk it resides in.

    // 3 units away from center
    const target: TargetCollisionGeometry = {
      id: 1,
      xAngleUnits: 10000,
      yAngleUnits: 10000,
      radiusAngleUnits: 50000,
    };

    // Exactly 5 units away: 3^2 + 4^2 = 5^2
    const yaw = createAngleUnits(10000 + 30000);
    const pitch = createAngleUnits(10000 + 40000);

    const hit = testAngularHit(yaw, pitch, target);
    expect(hit).toBe(true);

    // Just outside
    const pitchOut = createAngleUnits(10000 + 40001);
    const hitOut = testAngularHit(yaw, pitchOut, target);
    expect(hitOut).toBe(false);
  });
});
