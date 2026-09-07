import { FULL_TURN_UNITS, createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  MOTION_FLICK_HALF_HEIGHT_UNITS,
  MOTION_FLICK_HALF_WIDTH_UNITS,
  MOTION_FLICK_LIFETIME_TICKS,
  MOTION_FLICK_MAX_SPEED_UNITS_PER_TICK,
  MOTION_FLICK_RADIUS_UNITS,
  MotionFlickScenarioEngine,
} from "../src/motion-flick/dev-v0.js";

function signedYaw(x: number): number {
  return x > FULL_TURN_UNITS / 2 ? x - FULL_TURN_UNITS : x;
}

describe("Motion Flick scenario (dev-v0)", () => {
  it("starts on a static centre anchor", () => {
    const engine = new MotionFlickScenarioEngine();
    const centre = engine.initialize(createPrngV1([1, 2, 3, 4]));

    expect(centre.xAngleUnits).toBe(0);
    expect(centre.yAngleUnits).toBe(0);
    expect(centre.radiusAngleUnits).toBe(MOTION_FLICK_RADIUS_UNITS);
    expect(centre.lifetimeTicks).toBeUndefined();
  });

  it("the anchor does not drift", () => {
    const engine = new MotionFlickScenarioEngine();
    const prng = createPrngV1([1, 2, 3, 4]);
    engine.initialize(prng);

    for (let tick = 1; tick <= 200; tick++) {
      engine.tick(tick, prng);
    }

    const target = engine.getActiveTargets()[0]!;
    expect(target.xAngleUnits).toBe(0);
    expect(target.yAngleUnits).toBe(0);
  });

  it("spawns a moving target after the anchor is hit", () => {
    const engine = new MotionFlickScenarioEngine();
    const prng = createPrngV1([5, 6, 7, 8]);
    const centre = engine.initialize(prng);

    const moving = engine.onTargetHit(centre.id, 0, prng)!;
    expect(moving.lifetimeTicks).toBe(MOTION_FLICK_LIFETIME_TICKS);

    const before = engine.getActiveTargets()[0]!.xAngleUnits;
    engine.tick(1, prng);
    const after = engine.getActiveTargets()[0]!.xAngleUnits;

    const raw = Math.abs(after - before);
    const delta = Math.min(raw, FULL_TURN_UNITS - raw);
    expect(delta).toBeLessThanOrEqual(MOTION_FLICK_MAX_SPEED_UNITS_PER_TICK);
  });

  it("keeps the moving target inside the play area", () => {
    const engine = new MotionFlickScenarioEngine();
    const prng = createPrngV1([3, 3, 3, 3]);
    const centre = engine.initialize(prng);
    engine.onTargetHit(centre.id, 0, prng);

    for (let tick = 1; tick < MOTION_FLICK_LIFETIME_TICKS; tick++) {
      engine.tick(tick, prng);
      const target = engine.getActiveTargets()[0]!;
      expect(Math.abs(signedYaw(target.xAngleUnits))).toBeLessThanOrEqual(
        MOTION_FLICK_HALF_WIDTH_UNITS,
      );
      expect(Math.abs(target.yAngleUnits)).toBeLessThanOrEqual(
        MOTION_FLICK_HALF_HEIGHT_UNITS,
      );
    }
  });

  it("lets the moving target escape and restores the anchor", () => {
    const engine = new MotionFlickScenarioEngine();
    const prng = createPrngV1([2, 2, 2, 2]);
    const centre = engine.initialize(prng);
    const moving = engine.onTargetHit(centre.id, 0, prng)!;

    let expiredId: number | null = null;
    for (let tick = 1; tick <= MOTION_FLICK_LIFETIME_TICKS + 1; tick++) {
      const { expired } = engine.tick(tick, prng);
      if (expired) expiredId = expired.id;
    }

    expect(expiredId).toBe(moving.id);
    const restored = engine.getActiveTargets()[0]!;
    expect(restored.xAngleUnits).toBe(0);
    expect(restored.yAngleUnits).toBe(0);
  });

  it("returns to the anchor after intercepting the moving target", () => {
    const engine = new MotionFlickScenarioEngine();
    const prng = createPrngV1([7, 7, 7, 7]);
    const centre = engine.initialize(prng);
    const moving = engine.onTargetHit(centre.id, 0, prng)!;

    const back = engine.onTargetHit(moving.id, 20, prng)!;
    expect(back.xAngleUnits).toBe(0);
    expect(back.yAngleUnits).toBe(0);
  });

  it("ignores a hit on an unknown target id", () => {
    const engine = new MotionFlickScenarioEngine();
    const prng = createPrngV1([1, 1, 1, 1]);
    engine.initialize(prng);
    expect(engine.onTargetHit(9_999, 0, prng)).toBeNull();
  });

  it("is deterministic for the same seed", () => {
    const first = new MotionFlickScenarioEngine();
    const second = new MotionFlickScenarioEngine();
    const prngA = createPrngV1([9, 9, 9, 9]);
    const prngB = createPrngV1([9, 9, 9, 9]);
    const a = first.initialize(prngA);
    const b = second.initialize(prngB);
    expect(first.onTargetHit(a.id, 0, prngA)).toEqual(
      second.onTargetHit(b.id, 0, prngB),
    );
  });
});
