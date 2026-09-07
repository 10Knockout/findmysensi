import { FULL_TURN_UNITS, createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  HEADLINE_ACTIVE_TARGETS,
  HEADLINE_DEPTH_RADIUS_UNITS,
  HEADLINE_HALF_WIDTH_UNITS,
  HEADLINE_MAX_PITCH_UNITS,
  HEADLINE_MAX_RESPAWN_TICKS,
  HEADLINE_MIN_PITCH_UNITS,
  HeadlineScenarioEngine,
} from "../src/headline/dev-v0.js";

function signedYaw(x: number): number {
  return x > FULL_TURN_UNITS / 2 ? x - FULL_TURN_UNITS : x;
}

describe("Headshot Lane scenario (dev-v0)", () => {
  it("opens with four targets", () => {
    const engine = new HeadlineScenarioEngine();
    const targets = engine.initialize(createPrngV1([1, 2, 3, 4]));
    expect(targets).toHaveLength(HEADLINE_ACTIVE_TARGETS);
  });

  it("keeps every target inside the head-height band", () => {
    const engine = new HeadlineScenarioEngine();
    const prng = createPrngV1([5, 6, 7, 8]);
    engine.initialize(prng);

    for (let tick = 1; tick <= 500; tick++) {
      engine.tick(tick, prng);
      for (const target of engine.getActiveTargets()) {
        expect(target.yAngleUnits).toBeGreaterThanOrEqual(
          HEADLINE_MIN_PITCH_UNITS,
        );
        expect(target.yAngleUnits).toBeLessThanOrEqual(
          HEADLINE_MAX_PITCH_UNITS,
        );
      }
    }
  });

  it("uses one of the three depth radii for every target", () => {
    const engine = new HeadlineScenarioEngine();
    const targets = engine.initialize(createPrngV1([9, 9, 9, 9]));
    const validRadii = new Set(Object.values(HEADLINE_DEPTH_RADIUS_UNITS));

    for (const target of targets) {
      expect(validRadii.has(target.radiusAngleUnits)).toBe(true);
      expect(target.radiusAngleUnits).toBe(
        HEADLINE_DEPTH_RADIUS_UNITS[target.depth],
      );
    }
  });

  it("moves targets horizontally and reflects them at the lane edges", () => {
    const engine = new HeadlineScenarioEngine();
    const prng = createPrngV1([2, 2, 2, 2]);
    engine.initialize(prng);

    const startPitches = engine.getActiveTargets().map((t) => t.yAngleUnits);
    for (let tick = 1; tick <= 1_000; tick++) {
      engine.tick(tick, prng);
      for (const target of engine.getActiveTargets()) {
        expect(Math.abs(signedYaw(target.xAngleUnits))).toBeLessThanOrEqual(
          HEADLINE_HALF_WIDTH_UNITS,
        );
      }
    }

    // Movement is horizontal only: the surviving targets never changed height.
    const endPitches = engine.getActiveTargets().map((t) => t.yAngleUnits);
    expect(endPitches).toEqual(startPitches);
  });

  it("replaces a killed target after the respawn delay, keeping four alive", () => {
    const engine = new HeadlineScenarioEngine();
    const prng = createPrngV1([3, 3, 3, 3]);
    engine.initialize(prng);

    const victim = engine.getActiveTargets()[0]!;
    expect(engine.onTargetHit(victim.id, 0, prng)).toBe(true);
    expect(engine.getActiveCount()).toBe(HEADLINE_ACTIVE_TARGETS - 1);

    for (let tick = 1; tick <= HEADLINE_MAX_RESPAWN_TICKS + 1; tick++) {
      engine.tick(tick, prng);
    }

    expect(engine.getActiveCount()).toBe(HEADLINE_ACTIVE_TARGETS);
  });

  it("ignores a hit on an unknown target id", () => {
    const engine = new HeadlineScenarioEngine();
    const prng = createPrngV1([1, 1, 1, 1]);
    engine.initialize(prng);
    expect(engine.onTargetHit(9_999, 0, prng)).toBe(false);
  });

  it("is deterministic for the same seed", () => {
    const first = new HeadlineScenarioEngine();
    const second = new HeadlineScenarioEngine();
    expect(first.initialize(createPrngV1([7, 7, 7, 7]))).toEqual(
      second.initialize(createPrngV1([7, 7, 7, 7])),
    );
  });
});
