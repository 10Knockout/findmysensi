import { createPrngV1 } from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { SWITCH_TRACK_HOLD_TICKS } from "@findmysensi/scenarios";
import { describe, expect, it } from "vitest";
import { createSwitchTrackModeAdapter } from "../src/switch-track-adapter.js";

describe("Switch Track adapter", () => {
  it("records continuous samples, acquisition, and a completed switch", () => {
    const adapter = createSwitchTrackModeAdapter();
    adapter.initialize(createPrngV1([1, 2, 3, 4]));
    for (let tick = 0; tick < SWITCH_TRACK_HOLD_TICKS; tick++) {
      const target = adapter.getRenderTargets()[0]!;
      adapter.onSimulationTick(
        createTick(tick),
        target.xAngleUnits,
        target.yAngleUnits,
      );
    }

    const metrics = adapter.computeMetrics(SWITCH_TRACK_HOLD_TICKS);
    expect(metrics.totalTicks).toBe(SWITCH_TRACK_HOLD_TICKS);
    expect(metrics.switchesCompleted).toBe(1);
    expect(adapter.computeScore(metrics).score).toBeGreaterThan(0);
  });
});
