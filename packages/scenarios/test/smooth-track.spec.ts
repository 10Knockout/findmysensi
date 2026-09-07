import { FULL_TURN_UNITS, createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  SMOOTH_TRACK_DEV_V0_DEFINITION,
  SPHERE_MAX_DISTANCE,
  SPHERE_MAX_RADIUS_UNITS,
  SPHERE_MIN_DISTANCE,
  SPHERE_MIN_RADIUS_UNITS,
  SmoothTrackScenarioEngine,
} from "../src/smooth-track/dev-v0.js";

describe("Sphere Track scenario (dev-v0)", () => {
  it("declares a full turn of spawn width so yaw is unclamped", () => {
    // resolveCameraBounds derives the yaw limit from this, so a full turn
    // here is what makes 360 degree tracking reachable at all.
    expect(SMOOTH_TRACK_DEV_V0_DEFINITION.simulation.spawnAreaWidthUnits).toBe(
      FULL_TURN_UNITS,
    );
  });

  it("moves the target continuously without teleporting", () => {
    const engine = new SmoothTrackScenarioEngine();
    const prng = createPrngV1([1, 2, 3, 4]);
    engine.initialize(prng);

    let previous = engine.getTarget();
    let moved = false;
    for (let tick = 1; tick <= 600; tick++) {
      const { target } = engine.tick(tick, 0, 0, prng);
      // Shortest-path delta stays small: the orbit never jumps.
      const raw = Math.abs(target.xAngleUnits - previous.xAngleUnits);
      const delta = Math.min(raw, FULL_TURN_UNITS - raw);
      expect(delta).toBeLessThan(50_000);
      if (delta > 0) moved = true;
      previous = target;
    }
    expect(moved).toBe(true);
  });

  it("varies apparent size within the distance-derived radius band", () => {
    const engine = new SmoothTrackScenarioEngine();
    const prng = createPrngV1([5, 6, 7, 8]);
    engine.initialize(prng);

    for (let tick = 1; tick <= 1_500; tick++) {
      const { target } = engine.tick(tick, 0, 0, prng);
      expect(target.radiusAngleUnits).toBeGreaterThanOrEqual(
        SPHERE_MIN_RADIUS_UNITS,
      );
      expect(target.radiusAngleUnits).toBeLessThanOrEqual(
        SPHERE_MAX_RADIUS_UNITS,
      );
      expect(target.distanceUnits).toBeGreaterThanOrEqual(
        SPHERE_MIN_DISTANCE - 1,
      );
      expect(target.distanceUnits).toBeLessThanOrEqual(SPHERE_MAX_DISTANCE + 1);
    }
  });

  it("travels far enough in yaw to require turning past the screen", () => {
    const engine = new SmoothTrackScenarioEngine();
    const prng = createPrngV1([2, 4, 6, 8]);
    engine.initialize(prng);

    // Accumulate unwrapped yaw travel over a run's worth of ticks.
    let previous = engine.getTarget().xAngleUnits;
    let travelled = 0;
    for (let tick = 1; tick <= 128 * 30; tick++) {
      const x = engine.tick(tick, 0, 0, prng).target.xAngleUnits;
      const raw = Math.abs(x - previous);
      travelled += Math.min(raw, FULL_TURN_UNITS - raw);
      previous = x;
    }

    // Comfortably more than a quarter turn of cumulative travel.
    expect(travelled).toBeGreaterThan(FULL_TURN_UNITS / 4);
  });

  it("counts a crosshair riding the target as on-target time", () => {
    const engine = new SmoothTrackScenarioEngine();
    const prng = createPrngV1([3, 3, 3, 3]);
    engine.initialize(prng);

    for (let tick = 1; tick <= 300; tick++) {
      const target = engine.getTarget();
      engine.tick(tick, target.xAngleUnits, target.yAngleUnits, prng);
    }

    const metrics = engine.getTrackingMetrics();
    expect(metrics.totalTicks).toBe(300);
    expect(metrics.onTargetPercentage).toBeGreaterThan(90);
  });

  it("reports no on-target time for a crosshair parked far away", () => {
    const engine = new SmoothTrackScenarioEngine();
    const prng = createPrngV1([4, 4, 4, 4]);
    engine.initialize(prng);

    for (let tick = 1; tick <= 200; tick++) {
      engine.tick(tick, 0, 4_000_000, prng);
    }

    const metrics = engine.getTrackingMetrics();
    expect(metrics.onTargetTicks).toBe(0);
    expect(metrics.onTargetPercentage).toBe(0);
  });

  it("is deterministic for the same seed", () => {
    const first = new SmoothTrackScenarioEngine();
    const second = new SmoothTrackScenarioEngine();
    const prngA = createPrngV1([9, 9, 9, 9]);
    const prngB = createPrngV1([9, 9, 9, 9]);
    first.initialize(prngA);
    second.initialize(prngB);

    for (let tick = 1; tick <= 400; tick++) {
      expect(first.tick(tick, 0, 0, prngA)).toEqual(
        second.tick(tick, 0, 0, prngB),
      );
    }
  });
});
