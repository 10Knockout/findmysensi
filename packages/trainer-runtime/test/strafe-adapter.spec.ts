import {
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { STRAFE_RADIUS_UNITS } from "@findmysensi/scenarios";
import { describe, expect, it } from "vitest";
import { createStrafeModeAdapter } from "../src/strafe-adapter.js";

describe("createStrafeModeAdapter", () => {
  it("renders exactly one invincible target", () => {
    const adapter = createStrafeModeAdapter();
    adapter.initialize(createPrngV1([1, 2, 3, 4]));

    const targets = adapter.getRenderTargets();
    expect(targets.length).toBe(1);
    expect(targets[0]!.radiusAngleUnits).toBe(STRAFE_RADIUS_UNITS);
  });

  it("accumulates on-target time when the crosshair follows the target", () => {
    const adapter = createStrafeModeAdapter();
    adapter.initialize(createPrngV1([5, 5, 5, 5]));

    for (let tick = 1; tick <= 200; tick++) {
      const target = adapter.getRenderTargets()[0]!;
      adapter.onSimulationTick(
        createTick(tick),
        createAngleUnits(target.xAngleUnits),
        createPitchUnits(target.yAngleUnits),
      );
    }

    const metrics = adapter.computeMetrics(200);
    expect(metrics.totalTicks).toBe(200);
    expect(metrics.onTargetPercentage).toBeGreaterThan(90);
    expect(adapter.computeScore(metrics).score).toBeGreaterThan(0);
  });

  it("scores zero for a run that never touched the target", () => {
    const adapter = createStrafeModeAdapter();
    adapter.initialize(createPrngV1([6, 6, 6, 6]));

    for (let tick = 1; tick <= 100; tick++) {
      adapter.onSimulationTick(
        createTick(tick),
        createAngleUnits(0),
        createPitchUnits(4_000_000),
      );
    }

    const metrics = adapter.computeMetrics(100);
    expect(metrics.onTargetTicks).toBe(0);
    expect(adapter.computeScore(metrics).score).toBe(0);
  });

  it("ignores clicks entirely -- the target cannot be destroyed", () => {
    const adapter = createStrafeModeAdapter();
    const prng = createPrngV1([7, 7, 7, 7]);
    adapter.initialize(prng);

    const before = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(1),
      createAngleUnits(before.xAngleUnits),
      createPitchUnits(before.yAngleUnits),
      prng,
    );

    // Still exactly one target, and the shot contributed nothing.
    expect(adapter.getRenderTargets().length).toBe(1);
    expect(adapter.computeMetrics(1).totalTicks).toBe(0);
  });

  it("resets metrics on re-initialization", () => {
    const adapter = createStrafeModeAdapter();
    adapter.initialize(createPrngV1([1, 2, 3, 4]));

    for (let tick = 1; tick <= 50; tick++) {
      adapter.onSimulationTick(
        createTick(tick),
        createAngleUnits(0),
        createPitchUnits(0),
      );
    }
    expect(adapter.computeMetrics(50).totalTicks).toBe(50);

    adapter.initialize(createPrngV1([9, 9, 9, 9]));
    expect(adapter.computeMetrics(1).totalTicks).toBe(0);
  });
});
