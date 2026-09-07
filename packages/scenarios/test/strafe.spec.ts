import { FULL_TURN_UNITS, createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  STRAFE_HALF_WIDTH_UNITS,
  STRAFE_MAX_REVERSAL_TICKS,
  STRAFE_RADIUS_UNITS,
  STRAFE_SPEED_UNITS_PER_TICK,
  StrafeScenarioEngine,
} from "../src/strafe/dev-v0.js";

/** Yaw is stored wrapped, so re-sign it about zero for range assertions. */
function signedYaw(x: number): number {
  return x > FULL_TURN_UNITS / 2 ? x - FULL_TURN_UNITS : x;
}

describe("Strafe Track scenario (dev-v0)", () => {
  it("starts with a single centred target moving at the spec speed", () => {
    const engine = new StrafeScenarioEngine();
    const target = engine.initialize(createPrngV1([1, 2, 3, 4]));

    expect(target.id).toBe(1);
    expect(signedYaw(target.xAngleUnits)).toBe(0);
    expect(target.yAngleUnits).toBe(0);
    expect(target.radiusAngleUnits).toBe(STRAFE_RADIUS_UNITS);
    expect(Math.abs(target.velocityUnitsPerTick)).toBe(
      STRAFE_SPEED_UNITS_PER_TICK,
    );
  });

  it("moves the target every tick and keeps it inside the patrol range", () => {
    const engine = new StrafeScenarioEngine();
    const prng = createPrngV1([5, 6, 7, 8]);
    engine.initialize(prng);

    let previous = signedYaw(engine.getTarget().xAngleUnits);
    for (let tick = 1; tick <= 2_000; tick++) {
      const sample = engine.tick(tick, 0, 0, prng);
      const x = signedYaw(sample.target.xAngleUnits);
      expect(Math.abs(x)).toBeLessThanOrEqual(STRAFE_HALF_WIDTH_UNITS);
      // Movement is continuous: one tick never jumps further than a step of
      // travel, so the target never teleports across a reversal.
      expect(Math.abs(x - previous)).toBeLessThanOrEqual(
        STRAFE_SPEED_UNITS_PER_TICK * 2,
      );
      previous = x;
    }
  });

  it("reverses direction within the spec window", () => {
    const engine = new StrafeScenarioEngine();
    const prng = createPrngV1([2, 2, 2, 2]);
    engine.initialize(prng);

    let sawReversal = false;
    for (let tick = 1; tick <= STRAFE_MAX_REVERSAL_TICKS + 1; tick++) {
      if (engine.tick(tick, 0, 0, prng).reversed) {
        sawReversal = true;
        break;
      }
    }

    expect(sawReversal).toBe(true);
  });

  it("counts a crosshair sitting on the target as on-target time", () => {
    const engine = new StrafeScenarioEngine();
    const prng = createPrngV1([3, 3, 3, 3]);
    engine.initialize(prng);

    for (let tick = 1; tick <= 200; tick++) {
      // Track perfectly by reading the target's own position each tick.
      const target = engine.getTarget();
      engine.tick(tick, target.xAngleUnits, target.yAngleUnits, prng);
    }

    const metrics = engine.getTrackingMetrics();
    expect(metrics.totalTicks).toBe(200);
    expect(metrics.onTargetPercentage).toBeGreaterThan(90);
  });

  it("reports zero on-target time for a crosshair parked far away", () => {
    const engine = new StrafeScenarioEngine();
    const prng = createPrngV1([4, 4, 4, 4]);
    engine.initialize(prng);

    for (let tick = 1; tick <= 100; tick++) {
      engine.tick(tick, 0, 4_000_000, prng);
    }

    const metrics = engine.getTrackingMetrics();
    expect(metrics.onTargetTicks).toBe(0);
    expect(metrics.onTargetPercentage).toBe(0);
    expect(metrics.averageErrorUnits).toBeGreaterThan(STRAFE_RADIUS_UNITS);
  });

  it("is deterministic for the same seed", () => {
    const first = new StrafeScenarioEngine();
    const second = new StrafeScenarioEngine();
    const prngA = createPrngV1([9, 9, 9, 9]);
    const prngB = createPrngV1([9, 9, 9, 9]);
    first.initialize(prngA);
    second.initialize(prngB);

    for (let tick = 1; tick <= 300; tick++) {
      expect(first.tick(tick, 0, 0, prngA)).toEqual(
        second.tick(tick, 0, 0, prngB),
      );
    }
  });
});
