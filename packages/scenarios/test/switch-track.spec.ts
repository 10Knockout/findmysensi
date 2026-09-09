import { createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  SWITCH_TRACK_ACTIVE_TARGETS,
  SWITCH_TRACK_DEV_V0_DEFINITION,
  SWITCH_TRACK_RADIUS_UNITS,
  SWITCH_TRACK_TTK_TICKS,
  SwitchTrackScenarioEngine,
} from "../src/switch-track/dev-v0.js";

/** Rides whichever target is currently first in the active list. */
function trackFirstTarget(
  engine: SwitchTrackScenarioEngine,
  prng: ReturnType<typeof createPrngV1>,
  ticks: number,
  fromTick = 1,
  fireHeld = true,
): { kills: number; switches: number[] } {
  let kills = 0;
  const switches: number[] = [];
  for (let tick = fromTick; tick < fromTick + ticks; tick++) {
    const target = engine.getActiveTargets()[0]!;
    const sample = engine.tick(
      tick,
      target.xAngleUnits,
      target.yAngleUnits,
      prng,
      fireHeld,
    );
    if (sample.killed) kills++;
    if (sample.switchTicks !== null) switches.push(sample.switchTicks);
  }
  return { kills, switches };
}

describe("Switch Track scenario", () => {
  it("uses a fresh leaderboard scoring partition for fire-gated runs", () => {
    expect(SWITCH_TRACK_DEV_V0_DEFINITION.engineVersion).toBe(1);
    expect(SWITCH_TRACK_DEV_V0_DEFINITION.scenarioVersion).toBe(0);
    expect(SWITCH_TRACK_DEV_V0_DEFINITION.scoringVersion).toBe(1);
  });

  it("keeps four targets alive at all times", () => {
    const engine = new SwitchTrackScenarioEngine();
    const prng = createPrngV1([1, 2, 3, 4]);
    const initial = engine.initialize(prng);

    expect(initial).toHaveLength(SWITCH_TRACK_ACTIVE_TARGETS);
    for (const target of initial) {
      expect(target.radiusAngleUnits).toBe(SWITCH_TRACK_RADIUS_UNITS);
    }

    trackFirstTarget(engine, prng, 600);
    expect(engine.getActiveCount()).toBe(SWITCH_TRACK_ACTIVE_TARGETS);
  });

  it("kills a target only after enough sustained contact", () => {
    const engine = new SwitchTrackScenarioEngine();
    const prng = createPrngV1([1, 2, 3, 4]);
    engine.initialize(prng);

    // One tick short of the time-to-kill: nothing should have died yet.
    const before = trackFirstTarget(engine, prng, SWITCH_TRACK_TTK_TICKS - 1);
    expect(before.kills).toBe(0);

    // One more tick of contact finishes it.
    const after = trackFirstTarget(engine, prng, 1, SWITCH_TRACK_TTK_TICKS);
    expect(after.kills).toBe(1);
  });

  it("records contact but deals no damage while fire is not held", () => {
    const engine = new SwitchTrackScenarioEngine();
    const prng = createPrngV1([1, 2, 3, 4]);
    engine.initialize(prng);

    const result = trackFirstTarget(
      engine,
      prng,
      SWITCH_TRACK_TTK_TICKS * 2,
      1,
      false,
    );

    expect(result.kills).toBe(0);
  });

  it("makes no progress while contact is broken", () => {
    const engine = new SwitchTrackScenarioEngine();
    const prng = createPrngV1([5, 6, 7, 8]);
    engine.initialize(prng);

    // Build damage, then look away for a long stretch.
    trackFirstTarget(engine, prng, SWITCH_TRACK_TTK_TICKS - 1);
    for (let tick = 100; tick < 400; tick++) {
      const sample = engine.tick(tick, 5_000_000, 5_000_000, prng);
      expect(sample.onTarget).toBe(false);
      expect(sample.killed).toBe(false);
    }
  });

  it("reports a switch time once the player settles onto a new target", () => {
    const engine = new SwitchTrackScenarioEngine();
    const prng = createPrngV1([2, 2, 2, 2]);
    engine.initialize(prng);

    const { kills, switches } = trackFirstTarget(engine, prng, 900);
    expect(kills).toBeGreaterThan(1);
    // After the first kill, settling onto the next target yields a switch time.
    expect(switches.length).toBeGreaterThan(0);
    for (const ticks of switches) {
      expect(ticks).toBeGreaterThanOrEqual(0);
    }
  });

  it("reports no on-target contact for a crosshair parked away", () => {
    const engine = new SwitchTrackScenarioEngine();
    const prng = createPrngV1([3, 3, 3, 3]);
    engine.initialize(prng);

    for (let tick = 1; tick <= 200; tick++) {
      const sample = engine.tick(tick, 5_000_000, 5_000_000, prng);
      expect(sample.onTarget).toBe(false);
      expect(sample.errorUnits).toBeGreaterThan(SWITCH_TRACK_RADIUS_UNITS);
    }
  });

  it("is deterministic for the same seed", () => {
    const first = new SwitchTrackScenarioEngine();
    const second = new SwitchTrackScenarioEngine();
    expect(first.initialize(createPrngV1([9, 9, 9, 9]))).toEqual(
      second.initialize(createPrngV1([9, 9, 9, 9])),
    );
  });

  it("matches the fixed-seed fire-window golden", () => {
    const engine = new SwitchTrackScenarioEngine();
    const prng = createPrngV1([9, 9, 9, 9]);
    engine.initialize(prng);
    const killTicks: number[] = [];
    const switchTicks: number[] = [];

    for (let tick = 1; tick <= 70; tick++) {
      const target = engine.getActiveTargets()[0]!;
      const fireHeld = (tick >= 5 && tick <= 30) || (tick >= 40 && tick <= 70);
      const sample = engine.tick(
        tick,
        target.xAngleUnits,
        target.yAngleUnits,
        prng,
        fireHeld,
      );
      if (sample.killed) killTicks.push(tick);
      if (sample.switchTicks !== null) switchTicks.push(sample.switchTicks);
    }

    expect(killTicks).toEqual([64]);
    expect(switchTicks).toEqual([1]);
    expect(engine.getActiveTargets().map((target) => target.id)).toEqual([
      2, 3, 4, 5,
    ]);
  });
});
