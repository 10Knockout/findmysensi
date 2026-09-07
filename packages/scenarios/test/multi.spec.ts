import { createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  MULTI_GROW_END_TICKS,
  MULTI_HOLD_END_TICKS,
  MULTI_LIFETIME_TICKS,
  MULTI_MAX_ACTIVE_TARGETS,
  MULTI_MIN_ACTIVE_TARGETS,
  MULTI_PEAK_RADIUS_UNITS,
  MULTI_SPAWN_RADIUS_UNITS,
  MultiScenarioEngine,
  multiRadiusForAge,
} from "../src/multi/dev-v0.js";

describe("multiRadiusForAge", () => {
  it("starts at the spawn size and reaches peak by the end of the grow phase", () => {
    expect(multiRadiusForAge(0)).toBe(MULTI_SPAWN_RADIUS_UNITS);
    expect(multiRadiusForAge(MULTI_GROW_END_TICKS)).toBe(
      MULTI_PEAK_RADIUS_UNITS,
    );
  });

  it("holds peak size through the hold phase", () => {
    expect(multiRadiusForAge(MULTI_GROW_END_TICKS + 1)).toBe(
      MULTI_PEAK_RADIUS_UNITS,
    );
    expect(multiRadiusForAge(MULTI_HOLD_END_TICKS - 1)).toBe(
      MULTI_PEAK_RADIUS_UNITS,
    );
  });

  it("shrinks monotonically to nothing across the shrink phase", () => {
    let previous = multiRadiusForAge(MULTI_HOLD_END_TICKS);
    for (
      let age = MULTI_HOLD_END_TICKS + 1;
      age < MULTI_LIFETIME_TICKS;
      age += 8
    ) {
      const current = multiRadiusForAge(age);
      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
    expect(multiRadiusForAge(MULTI_LIFETIME_TICKS)).toBe(0);
  });

  it("treats an out-of-range age as gone", () => {
    expect(multiRadiusForAge(-1)).toBe(0);
    expect(multiRadiusForAge(MULTI_LIFETIME_TICKS + 500)).toBe(0);
  });
});

describe("Multi Burst scenario (dev-v0)", () => {
  it("opens with the minimum population at spawn size", () => {
    const engine = new MultiScenarioEngine();
    const targets = engine.initialize(createPrngV1([1, 2, 3, 4]));

    expect(targets.length).toBe(MULTI_MIN_ACTIVE_TARGETS);
    for (const target of targets) {
      expect(target.radiusAngleUnits).toBe(MULTI_SPAWN_RADIUS_UNITS);
      expect(target.spawnTick).toBe(0);
    }
  });

  it("fills the arena to the maximum and never overruns it", () => {
    const engine = new MultiScenarioEngine();
    const prng = createPrngV1([5, 5, 5, 5]);
    engine.initialize(prng);

    // Targets expire on a timer while new ones trickle in, so the population
    // settles into a churn near the cap rather than sitting pinned at it.
    // What matters is that it does reach the cap and never exceeds it.
    let peak = engine.getActiveCount();
    for (let tick = 1; tick <= 400; tick++) {
      engine.tick(tick, prng);
      const count = engine.getActiveCount();
      peak = Math.max(peak, count);
      expect(count).toBeLessThanOrEqual(MULTI_MAX_ACTIVE_TARGETS);
      expect(count).toBeGreaterThanOrEqual(MULTI_MIN_ACTIVE_TARGETS);
    }

    expect(peak).toBe(MULTI_MAX_ACTIVE_TARGETS);
  });

  it("expires a target that outlives its window", () => {
    const engine = new MultiScenarioEngine();
    const prng = createPrngV1([2, 4, 6, 8]);
    engine.initialize(prng);

    let sawExpiry = false;
    for (let tick = 1; tick <= MULTI_LIFETIME_TICKS + 2; tick++) {
      const { expired } = engine.tick(tick, prng);
      if (expired.length > 0) sawExpiry = true;
    }

    expect(sawExpiry).toBe(true);
  });

  it("never drops below the minimum population after a kill", () => {
    const engine = new MultiScenarioEngine();
    const prng = createPrngV1([3, 3, 3, 3]);
    engine.initialize(prng);

    for (let i = 0; i < 10; i++) {
      const target = engine.getActiveTargets()[0]!;
      engine.onTargetHit(target.id, prng);
      expect(engine.getActiveCount()).toBeGreaterThanOrEqual(
        MULTI_MIN_ACTIVE_TARGETS,
      );
    }
  });

  it("ignores a hit on an unknown target id", () => {
    const engine = new MultiScenarioEngine();
    const prng = createPrngV1([1, 1, 1, 1]);
    engine.initialize(prng);
    expect(engine.onTargetHit(9_999, prng)).toBeNull();
  });

  it("is deterministic for the same seed", () => {
    const first = new MultiScenarioEngine();
    const second = new MultiScenarioEngine();
    const a = first.initialize(createPrngV1([7, 7, 7, 7]));
    const b = second.initialize(createPrngV1([7, 7, 7, 7]));
    expect(a).toEqual(b);
  });
});
