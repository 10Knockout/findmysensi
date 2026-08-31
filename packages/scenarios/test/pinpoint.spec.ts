import { createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  PinpointScenarioEngine,
  PINPOINT_TARGET_LIFETIME_TICKS,
} from "../src/pinpoint/dev-v0.js";

describe("Pinpoint Scenario (dev-v0)", () => {
  const seed: [number, number, number, number] = [111, 222, 333, 444];

  it("initializes with exactly 6 non-overlapping targets", () => {
    const engine = new PinpointScenarioEngine();
    const prng = createPrngV1(seed);

    const targets = engine.initialize(prng, 0);
    expect(targets.length).toBe(6);

    // All positions are distinct
    const posKeys = new Set(
      targets.map((t) => `${t.xAngleUnits},${t.yAngleUnits}`),
    );
    expect(posKeys.size).toBe(6);

    // All have small radius
    for (const t of targets) {
      expect(t.radiusAngleUnits).toBe(12000);
    }
  });

  it("all targets have lifetime ticks set", () => {
    const engine = new PinpointScenarioEngine();
    const prng = createPrngV1(seed);

    const targets = engine.initialize(prng, 100);
    for (const t of targets) {
      expect(t.lifetimeTicks).toBe(100 + PINPOINT_TARGET_LIFETIME_TICKS);
    }
  });

  it("replaces a hit target with a new one", () => {
    const engine = new PinpointScenarioEngine();
    const prng = createPrngV1(seed);

    const targets = engine.initialize(prng, 0);
    const hitTarget = targets[0]!;
    const replacement = engine.onTargetHit(hitTarget.id, prng, 50);

    expect(replacement).toBeDefined();
    expect(replacement!.id).not.toBe(hitTarget.id);

    const active = engine.getActiveTargets();
    expect(active.length).toBe(6);
    expect(active.find((t) => t.id === hitTarget.id)).toBeUndefined();
  });

  it("expires targets and spawns replacements on tick", () => {
    const engine = new PinpointScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng, 0);
    // Advance past lifetime
    const result = engine.tick(PINPOINT_TARGET_LIFETIME_TICKS + 1, prng);

    expect(result.expired.length).toBeGreaterThan(0);
    expect(result.spawned.length).toBe(result.expired.length);
    expect(engine.getActiveTargets().length).toBe(6);
  });

  it("is deterministic with the same seed", () => {
    const engine1 = new PinpointScenarioEngine();
    const prng1 = createPrngV1(seed);
    const targets1 = engine1.initialize(prng1, 0);

    const engine2 = new PinpointScenarioEngine();
    const prng2 = createPrngV1(seed);
    const targets2 = engine2.initialize(prng2, 0);

    expect(targets1).toEqual(targets2);
  });
});
