import { createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  REACTION_MAX_DELAY_TICKS,
  REACTION_TARGET_LIFETIME_TICKS,
  ReactionScenarioEngine,
} from "../src/reaction/dev-v0.js";

describe("Reaction scenario", () => {
  it("uses tick-authoritative hidden, visible, and expiry phases", () => {
    const engine = new ReactionScenarioEngine();
    const prng = createPrngV1([1, 2, 3, 4]);
    engine.initialize(prng);
    expect(engine.getActiveTargets()).toEqual([]);

    let spawnTick = -1;
    for (let tick = 0; tick <= REACTION_MAX_DELAY_TICKS; tick++) {
      if (engine.tick(tick, prng).spawned) {
        spawnTick = tick;
        break;
      }
    }
    expect(spawnTick).toBeGreaterThan(0);
    expect(engine.getActiveTargets()).toHaveLength(1);
    expect(
      engine.tick(spawnTick + REACTION_TARGET_LIFETIME_TICKS, prng).expired,
    ).not.toBeNull();
  });

  it("schedules another hidden delay after a hit", () => {
    const engine = new ReactionScenarioEngine();
    const prng = createPrngV1([5, 6, 7, 8]);
    engine.initialize(prng);
    let tick = 0;
    while (engine.getActiveTargets().length === 0) engine.tick(tick++, prng);
    const target = engine.getActiveTargets()[0]!;
    expect(engine.onTargetHit(target.id, tick, prng)).toBe(true);
    expect(engine.getActiveTargets()).toEqual([]);
    expect(engine.tick(tick + 1, prng).spawned).toBeNull();
  });
});
