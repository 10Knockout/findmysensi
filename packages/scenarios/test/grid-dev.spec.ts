import { createPrngV1, FULL_TURN_UNITS } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  GRID_DEV_V0_DEFINITION,
  GridScenarioEngine,
} from "../src/grid/dev-v0.js";

describe("Grid Shot Development Scenario (dev-v0)", () => {
  it("initializes with exactly 3 non-overlapping targets on the grid", () => {
    const engine = new GridScenarioEngine();
    const prng = createPrngV1([101, 202, 303, 404]);

    const initialTargets = engine.initialize(prng);
    expect(initialTargets.length).toBe(3);

    const posKeys = new Set(
      initialTargets.map((t) => `${t.xAngleUnits},${t.yAngleUnits}`),
    );
    expect(posKeys.size).toBe(3);
  });

  it("uses the Phase 2 medium target radius and canonical wrapped yaw", () => {
    const engine = new GridScenarioEngine();
    const prng = createPrngV1([101, 202, 303, 404]);
    const targets = engine.initialize(prng);

    expect(GRID_DEV_V0_DEFINITION.simulation.targetRadiusAngleUnits).toBe(
      50_000,
    );
    expect(targets).toHaveLength(3);
    for (const target of targets) {
      expect(target.radiusAngleUnits).toBe(50_000);
      expect(target.xAngleUnits).toBeGreaterThanOrEqual(0);
      expect(target.xAngleUnits).toBeLessThan(FULL_TURN_UNITS);
    }
  });

  it("replaces a hit target with a new target in a distinct slot with recent-location exclusion", () => {
    const engine = new GridScenarioEngine();
    const prng = createPrngV1([555, 666, 777, 888]);

    const initialTargets = engine.initialize(prng);
    const targetToHit = initialTargets[0]!;

    const replacement = engine.onTargetHit(targetToHit.id, prng);
    expect(replacement).toBeDefined();
    expect(replacement?.id).toBe(4);

    const activeAfterHit = engine.getActiveTargets();
    expect(activeAfterHit.length).toBe(3);
    expect(activeAfterHit.find((t) => t.id === targetToHit.id)).toBeUndefined();

    expect(
      replacement?.xAngleUnits === targetToHit.xAngleUnits &&
        replacement?.yAngleUnits === targetToHit.yAngleUnits,
    ).toBe(false);
  });

  it("produces a 100% deterministic spawn sequence given identical PRNG seeds", () => {
    const seed: [number, number, number, number] = [
      0x12345678, 0x9abcdef0, 0x0fedcba9, 0x87654321,
    ];

    const engine1 = new GridScenarioEngine();
    const prng1 = createPrngV1(seed);
    const targets1 = engine1.initialize(prng1);

    const engine2 = new GridScenarioEngine();
    const prng2 = createPrngV1(seed);
    const targets2 = engine2.initialize(prng2);

    expect(targets1).toEqual(targets2);

    for (let i = 0; i < 20; i++) {
      const active1 = engine1.getActiveTargets();
      const active2 = engine2.getActiveTargets();
      expect(active1).toEqual(active2);

      const hitTargetId = active1[0]!.id;
      const rep1 = engine1.onTargetHit(hitTargetId, prng1);
      const rep2 = engine2.onTargetHit(hitTargetId, prng2);
      expect(rep1).toEqual(rep2);
    }
  });

  it("keeps exactly three unique active targets through rapid deterministic hits", () => {
    const engine = new GridScenarioEngine();
    const prng = createPrngV1([11, 22, 33, 44]);
    engine.initialize(prng);

    for (let i = 0; i < 100; i++) {
      const before = engine.getActiveTargets();
      expect(before).toHaveLength(3);
      expect(new Set(before.map((target) => target.id)).size).toBe(3);

      const replacement = engine.onTargetHit(before[0]!.id, prng);
      expect(replacement).not.toBeNull();
      expect(engine.getActiveTargets()).toHaveLength(3);
    }
  });
});
