import { createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  SWITCH_TRACK_HOLD_TICKS,
  SwitchTrackScenarioEngine,
} from "../src/switch-track/dev-v0.js";

describe("Switch Track scenario", () => {
  it("switches only after a sustained on-target hold", () => {
    const engine = new SwitchTrackScenarioEngine();
    const prng = createPrngV1([1, 2, 3, 4]);
    const first = engine.initialize(prng);
    let switched = false;

    for (let tick = 0; tick < SWITCH_TRACK_HOLD_TICKS; tick++) {
      const target = engine.getTarget();
      switched = engine.tick(
        tick,
        target.xAngleUnits,
        target.yAngleUnits,
        prng,
      ).switched;
    }

    expect(switched).toBe(true);
    expect(engine.getTarget().id).not.toBe(first.id);
  });

  it("resets the hold when the crosshair leaves the target", () => {
    const engine = new SwitchTrackScenarioEngine();
    const prng = createPrngV1([5, 6, 7, 8]);
    engine.initialize(prng);
    for (let tick = 0; tick < SWITCH_TRACK_HOLD_TICKS - 1; tick++) {
      const target = engine.getTarget();
      engine.tick(tick, target.xAngleUnits, target.yAngleUnits, prng);
    }
    expect(engine.tick(40, 5_000_000, 5_000_000, prng).switched).toBe(false);
  });
});
