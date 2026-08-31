import { createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import { StrafeScenarioEngine } from "../src/strafe/dev-v0.js";

describe("Strafe Scenario (dev-v0)", () => {
  const seed: [number, number, number, number] = [1000, 2000, 3000, 4000];

  it("initializes with 2 moving targets", () => {
    const engine = new StrafeScenarioEngine();
    const prng = createPrngV1(seed);

    const targets = engine.initialize(prng, 0);
    expect(targets.length).toBe(2);

    for (const t of targets) {
      expect(["linear", "oscillating"]).toContain(t.pattern);
      expect(["left", "right"]).toContain(t.direction);
      expect(t.velocityUnitsPerTick).not.toBe(0);
    }
  });

  it("targets move on tick", () => {
    const engine = new StrafeScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng, 0);
    const beforePositions = engine.getActiveTargets().map((t) => t.xAngleUnits);

    engine.tick(1);
    const afterPositions = engine.getActiveTargets().map((t) => t.xAngleUnits);

    // At least one target should have moved
    const moved = beforePositions.some((x, i) => x !== afterPositions[i]);
    expect(moved).toBe(true);
  });

  it("targets bounce off boundaries after many ticks", () => {
    const engine = new StrafeScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng, 0);
    const halfW = Math.floor(1400000 / 2);

    // Run many ticks
    for (let i = 1; i <= 1000; i++) {
      engine.tick(i);
    }

    // All targets should still be within bounds
    for (const t of engine.getActiveTargets()) {
      expect(Math.abs(t.xAngleUnits)).toBeLessThanOrEqual(halfW + 100000);
    }
  });

  it("replaces a hit target with a new moving target", () => {
    const engine = new StrafeScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng, 0);
    const hitTarget = engine.getActiveTargets()[0]!;
    const replacement = engine.onTargetHit(hitTarget.id, prng, 50);

    expect(replacement).toBeDefined();
    expect(replacement!.id).not.toBe(hitTarget.id);
    expect(engine.getActiveTargets().length).toBe(2);
  });

  it("is deterministic with the same seed", () => {
    const engine1 = new StrafeScenarioEngine();
    const prng1 = createPrngV1(seed);
    const targets1 = engine1.initialize(prng1, 0);

    const engine2 = new StrafeScenarioEngine();
    const prng2 = createPrngV1(seed);
    const targets2 = engine2.initialize(prng2, 0);

    expect(targets1).toEqual(targets2);
  });
});
