import { createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import { MultiScenarioEngine } from "../src/multi/dev-v0.js";

describe("Multi Scenario (dev-v0)", () => {
  const seed: [number, number, number, number] = [0xaa, 0xbb, 0xcc, 0xdd];

  it("initializes with 5 active targets of varying sizes", () => {
    const engine = new MultiScenarioEngine();
    const prng = createPrngV1(seed);

    const targets = engine.initialize(prng);
    expect(targets.length).toBe(5);

    // Targets should have valid sizes
    for (const t of targets) {
      expect(["large", "medium", "small"]).toContain(t.size);
      expect(t.radiusAngleUnits).toBeGreaterThan(0);
    }
  });

  it("decrements quota on hit and spawns replacement from queue", () => {
    const engine = new MultiScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng);
    const initialQuota = engine.getRemainingQuota();
    expect(initialQuota).toBe(55); // 60 total - 5 initial = 55

    const active = engine.getActiveTargets();
    const replacement = engine.onTargetHit(active[0]!.id, prng);
    expect(replacement).not.toBeNull();

    expect(engine.getRemainingQuota()).toBe(54);
    expect(engine.getActiveTargets().length).toBe(5);
  });

  it("returns null replacement when quota is exhausted", () => {
    const engine = new MultiScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng);

    // Exhaust all quota
    for (let i = 0; i < 60; i++) {
      const active = engine.getActiveTargets();
      if (active.length === 0) break;
      engine.onTargetHit(active[0]!.id, prng);
    }

    expect(engine.getRemainingQuota()).toBe(0);
  });

  it("is deterministic with the same seed", () => {
    const engine1 = new MultiScenarioEngine();
    const prng1 = createPrngV1(seed);
    const targets1 = engine1.initialize(prng1);

    const engine2 = new MultiScenarioEngine();
    const prng2 = createPrngV1(seed);
    const targets2 = engine2.initialize(prng2);

    expect(targets1).toEqual(targets2);
  });
});
