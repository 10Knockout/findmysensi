import {
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
  wrapYaw,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { PINPOINT_TARGET_LIFETIME_TICKS } from "@findmysensi/scenarios";
import { describe, expect, it } from "vitest";
import { createPinpointModeAdapter } from "../src/pinpoint-adapter.js";

describe("createPinpointModeAdapter", () => {
  it("initializes exactly 6 targets with the small Pinpoint radius", () => {
    const adapter = createPinpointModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);

    adapter.initialize(prng);

    const targets = adapter.getRenderTargets();
    expect(targets.length).toBe(6);
    expect(targets.every((t) => t.radiusAngleUnits === 29_127)).toBe(true);
  });

  it("records a hit via onShot and reflects it in computeMetrics", () => {
    const adapter = createPinpointModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);

    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(5),
      createAngleUnits(wrapYaw(target.xAngleUnits)),
      createPitchUnits(target.yAngleUnits),
      prng,
    );

    const metrics = adapter.computeMetrics(6);
    expect(metrics.hits).toBe(1);
    expect(metrics.shots).toBe(1);
    expect(metrics.misses).toBe(0);
    expect(adapter.getRenderTargets().length).toBe(6);
  });

  it("records a miss via onShot when no target is at the aim point", () => {
    const adapter = createPinpointModeAdapter();
    const prng = createPrngV1([9, 8, 7, 6]);
    adapter.initialize(prng);

    adapter.onShot(
      createTick(1),
      createAngleUnits(0),
      createPitchUnits(0),
      prng,
    );

    const metrics = adapter.computeMetrics(2);
    expect(metrics.hits).toBe(0);
    expect(metrics.shots).toBe(1);
    expect(metrics.misses).toBe(1);
  });

  it("expires unclicked targets via onSimulationTick and records them as misses without inflating shots", () => {
    const adapter = createPinpointModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);

    const expiredTick = PINPOINT_TARGET_LIFETIME_TICKS + 1;
    adapter.onSimulationTick(
      createTick(expiredTick),
      createAngleUnits(0),
      createPitchUnits(0),
    );

    const metrics = adapter.computeMetrics(expiredTick + 1);
    expect(metrics.misses).toBeGreaterThan(0);
    expect(metrics.shots).toBe(0);
    // Replacements were spawned to keep exactly 6 active targets.
    expect(adapter.getRenderTargets().length).toBe(6);
  });

  it("computeScore matches computePinpointDevScore's own formula for the same metrics", () => {
    const adapter = createPinpointModeAdapter();
    const prng = createPrngV1([1, 1, 1, 1]);
    adapter.initialize(prng);

    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(1),
      createAngleUnits(wrapYaw(target.xAngleUnits)),
      createPitchUnits(target.yAngleUnits),
      prng,
    );

    const metrics = adapter.computeMetrics(2);
    const result = adapter.computeScore(metrics);
    // 1 hit, 0 misses, 1 shot: 1*1500 - 0*300 = 1500, then 100% accuracy
    // triggers the >=99% bonus: floor(1500 * 1.5) = 2250.
    expect(result.score).toBe(2250);
  });

  it("classifies a miss's direction via getMissBreakdown", () => {
    const adapter = createPinpointModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);
    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(1),
      createAngleUnits(wrapYaw(target.xAngleUnits + 100_000)),
      createPitchUnits(target.yAngleUnits),
      prng,
    );
    expect(adapter.getMissBreakdown().left).toBe(1);
  });

  it("re-initializing resets metrics and target state for a second run", () => {
    const adapter = createPinpointModeAdapter();
    const prngA = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prngA);
    adapter.onShot(
      createTick(1),
      createAngleUnits(0),
      createPitchUnits(0),
      prngA,
    );
    expect(adapter.computeMetrics(2).shots).toBe(1);

    const prngB = createPrngV1([5, 6, 7, 8]);
    adapter.initialize(prngB);
    expect(adapter.computeMetrics(1).shots).toBe(0);
  });
});
