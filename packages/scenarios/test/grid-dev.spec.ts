import { createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import { GridScenarioEngine } from "../src/grid/dev-v0.js";

describe("Grid Shot Development Scenario (dev-v0)", () => {
  it("initializes with exactly 3 non-overlapping targets on the grid", () => {
    const engine = new GridScenarioEngine();
    const prng = createPrngV1([101, 202, 303, 404]);

    const initialTargets = engine.initialize(prng);
    expect(initialTargets.length).toBe(3);

    // Verify all 3 have distinct positions
    const posKeys = new Set(
      initialTargets.map((t) => `${t.xAngleUnits},${t.yAngleUnits}`),
    );
    expect(posKeys.size).toBe(3);
  });

  it("replaces a hit target with a new target in a distinct slot with recent-location exclusion", () => {
    const engine = new GridScenarioEngine();
    const prng = createPrngV1([555, 666, 777, 888]);

    const initialTargets = engine.initialize(prng);
    const targetToHit = initialTargets[0]!;

    const replacement = engine.onTargetHit(targetToHit.id, prng);
    expect(replacement).toBeDefined();
    expect(replacement?.id).toBe(4); // Incremented ID

    const activeAfterHit = engine.getActiveTargets();
    expect(activeAfterHit.length).toBe(3);
    expect(activeAfterHit.find((t) => t.id === targetToHit.id)).toBeUndefined();

    // Replacement must not be at the exact slot that was just hit
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

    // Simulate 20 successive target hits
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
});
