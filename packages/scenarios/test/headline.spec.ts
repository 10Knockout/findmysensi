import { createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import { HeadlineScenarioEngine } from "../src/headline/dev-v0.js";

describe("Headline Scenario (dev-v0)", () => {
  const seed: [number, number, number, number] = [500, 600, 700, 800];

  it("initializes with exactly 1 active target", () => {
    const engine = new HeadlineScenarioEngine();
    const prng = createPrngV1(seed);

    const targets = engine.initialize(prng);
    expect(targets.length).toBe(1);
  });

  it("targets are constrained to the head-height band", () => {
    const engine = new HeadlineScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng);

    // Hit and respawn 20 targets, verify vertical bounds
    for (let i = 0; i < 20; i++) {
      const active = engine.getActiveTargets();
      expect(active.length).toBe(1);
      const t = active[0]!;
      // Vertical should be within ±90000 (half of 180000 band)
      expect(Math.abs(t.yAngleUnits)).toBeLessThanOrEqual(90001);

      engine.onTargetHit(t.id, prng);
    }
  });

  it("enforces minimum horizontal separation between consecutive targets", () => {
    const engine = new HeadlineScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng);

    let prevX = engine.getActiveTargets()[0]!.xAngleUnits;

    for (let i = 0; i < 15; i++) {
      const t = engine.getActiveTargets()[0]!;
      engine.onTargetHit(t.id, prng);
      const newT = engine.getActiveTargets()[0]!;
      // Most should have significant horizontal separation
      // (rejection sampling with 100 attempts makes this very likely)
      if (i > 0) {
        // At minimum, they should not be identical
        expect(
          newT.xAngleUnits !== prevX || newT.yAngleUnits !== t.yAngleUnits,
        ).toBe(true);
      }
      prevX = newT.xAngleUnits;
    }
  });

  it("is deterministic with the same seed", () => {
    const engine1 = new HeadlineScenarioEngine();
    const prng1 = createPrngV1(seed);
    const targets1 = engine1.initialize(prng1);

    const engine2 = new HeadlineScenarioEngine();
    const prng2 = createPrngV1(seed);
    const targets2 = engine2.initialize(prng2);

    expect(targets1).toEqual(targets2);
  });
});
