import {
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import {
  SWITCH_TRACK_ACTIVE_TARGETS,
  SWITCH_TRACK_TTK_TICKS,
} from "@findmysensi/scenarios";
import { describe, expect, it } from "vitest";
import { createSwitchTrackModeAdapter } from "../src/switch-track-adapter.js";

describe("Switch Track adapter", () => {
  it("renders all four targets", () => {
    const adapter = createSwitchTrackModeAdapter();
    adapter.initialize(createPrngV1([1, 2, 3, 4]));
    expect(adapter.getRenderTargets()).toHaveLength(
      SWITCH_TRACK_ACTIVE_TARGETS,
    );
  });

  it("records continuous samples, acquisition, and a completed switch", () => {
    const adapter = createSwitchTrackModeAdapter();
    adapter.initialize(createPrngV1([1, 2, 3, 4]));

    const ticks = SWITCH_TRACK_TTK_TICKS + 1;
    for (let tick = 1; tick <= ticks; tick++) {
      const target = adapter.getRenderTargets()[0]!;
      adapter.onSimulationTick(
        createTick(tick),
        createAngleUnits(target.xAngleUnits),
        createPitchUnits(target.yAngleUnits),
      );
    }

    const metrics = adapter.computeMetrics(ticks);
    expect(metrics.totalTicks).toBe(ticks);
    expect(metrics.switchesCompleted).toBe(1);
    expect(metrics.onTargetTicks).toBeGreaterThan(0);
    expect(adapter.computeScore(metrics).score).toBeGreaterThan(0);
  });

  it("records nothing on target for a crosshair parked away", () => {
    const adapter = createSwitchTrackModeAdapter();
    adapter.initialize(createPrngV1([5, 5, 5, 5]));

    for (let tick = 1; tick <= 200; tick++) {
      adapter.onSimulationTick(
        createTick(tick),
        createAngleUnits(5_000_000),
        createPitchUnits(5_000_000),
      );
    }

    const metrics = adapter.computeMetrics(200);
    expect(metrics.onTargetTicks).toBe(0);
    expect(metrics.switchesCompleted).toBe(0);
  });

  it("ignores clicks -- damage comes from contact, not shots", () => {
    const adapter = createSwitchTrackModeAdapter();
    const prng = createPrngV1([7, 7, 7, 7]);
    adapter.initialize(prng);

    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(1),
      createAngleUnits(target.xAngleUnits),
      createPitchUnits(target.yAngleUnits),
      prng,
    );

    expect(adapter.getRenderTargets()).toHaveLength(
      SWITCH_TRACK_ACTIVE_TARGETS,
    );
    expect(adapter.computeMetrics(1).totalTicks).toBe(0);
  });

  it("resets metrics on re-initialization", () => {
    const adapter = createSwitchTrackModeAdapter();
    adapter.initialize(createPrngV1([1, 2, 3, 4]));

    for (let tick = 1; tick <= 40; tick++) {
      adapter.onSimulationTick(
        createTick(tick),
        createAngleUnits(0),
        createPitchUnits(0),
      );
    }
    expect(adapter.computeMetrics(40).totalTicks).toBe(40);

    adapter.initialize(createPrngV1([8, 8, 8, 8]));
    expect(adapter.computeMetrics(1).totalTicks).toBe(0);
  });
});
