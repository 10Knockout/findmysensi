import {
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
  wrapYaw,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import { createMultiModeAdapter } from "../src/multi-adapter.js";

describe("createMultiModeAdapter", () => {
  it("initializes exactly 5 targets drawn from the mixed size quota", () => {
    const adapter = createMultiModeAdapter();
    const prng = createPrngV1([101, 202, 303, 404]);

    adapter.initialize(prng);

    const targets = adapter.getRenderTargets();
    expect(targets.length).toBe(5);
    // Sizes vary; every radius must be one of the three defined sizes.
    const validRadii = new Set([40_000, 25_000, 15_000]);
    expect(targets.every((t) => validRadii.has(t.radiusAngleUnits))).toBe(true);
  });

  it("records a hit via onShot and reflects it in computeMetrics", () => {
    const adapter = createMultiModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);

    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(5),
      createAngleUnits(target.xAngleUnits),
      createPitchUnits(target.yAngleUnits),
      prng,
    );

    const metrics = adapter.computeMetrics(6);
    expect(metrics.hits).toBe(1);
    expect(metrics.shots).toBe(1);
    expect(metrics.misses).toBe(0);
    expect(adapter.getRenderTargets().length).toBe(5);
  });

  it("records a miss via onShot when no target is at the aim point", () => {
    const adapter = createMultiModeAdapter();
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

  it("computeScore matches computeMultiDevScore's own formula for the same metrics", () => {
    const adapter = createMultiModeAdapter();
    const prng = createPrngV1([1, 1, 1, 1]);
    adapter.initialize(prng);

    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(1),
      createAngleUnits(target.xAngleUnits),
      createPitchUnits(target.yAngleUnits),
      prng,
    );

    const metrics = adapter.computeMetrics(2);
    const result = adapter.computeScore(metrics);
    // 1 hit, 0 misses: 1*800 - 0*150 = 800. killsPerSecond at this tiny
    // elapsed duration is far above the >=6 threshold, so the 1.3x speed
    // bonus applies: floor(800 * 1.3) = 1040.
    expect(result.score).toBe(1040);
  });

  it("stops spawning once the 60-target quota is exhausted, without crashing", () => {
    const adapter = createMultiModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);

    // The quota (60) covers the 5 initial spawns too, so exactly 60 hits
    // exhausts it. Hit more than that to prove exhaustion doesn't crash.
    let tick = 1;
    for (let i = 0; i < 80; i++) {
      const active = adapter.getRenderTargets();
      if (active.length === 0) break;
      const target = active[0]!;
      adapter.onShot(
        createTick(tick),
        createAngleUnits(target.xAngleUnits),
        createPitchUnits(target.yAngleUnits),
        prng,
      );
      tick++;
    }

    const metrics = adapter.computeMetrics(tick);
    expect(metrics.hits).toBe(60);
    expect(adapter.getRenderTargets().length).toBe(0);
  });

  it("classifies a miss's direction via getMissBreakdown", () => {
    const adapter = createMultiModeAdapter();
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
    const adapter = createMultiModeAdapter();
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
    expect(adapter.getRenderTargets().length).toBe(5);
  });
});
