import {
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
  wrapYaw,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import {
  MULTI_LIFETIME_TICKS,
  MULTI_MAX_ACTIVE_TARGETS,
  MULTI_MIN_ACTIVE_TARGETS,
  MULTI_SPAWN_RADIUS_UNITS,
} from "@findmysensi/scenarios";
import { describe, expect, it } from "vitest";
import { createMultiModeAdapter } from "../src/multi-adapter.js";

describe("createMultiModeAdapter", () => {
  it("opens with the minimum population at spawn size", () => {
    const adapter = createMultiModeAdapter();
    adapter.initialize(createPrngV1([101, 202, 303, 404]));

    const targets = adapter.getRenderTargets();
    expect(targets.length).toBe(MULTI_MIN_ACTIVE_TARGETS);
    expect(
      targets.every((t) => t.radiusAngleUnits === MULTI_SPAWN_RADIUS_UNITS),
    ).toBe(true);
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
    // A kill drops the arena below its floor, so a replacement arrives.
    expect(adapter.getRenderTargets().length).toBe(MULTI_MIN_ACTIVE_TARGETS);
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
    // 1 hit, 0 misses: 1*800 - 0*150 = 800. killsPerSecond at this tiny
    // elapsed duration is far above the >=6 threshold, so the 1.3x speed
    // bonus applies: floor(800 * 1.3) = 1040.
    expect(adapter.computeScore(metrics).score).toBe(1040);
  });

  it("counts an undestroyed target as a miss once it expires, without inflating shots", () => {
    const adapter = createMultiModeAdapter();
    adapter.initialize(createPrngV1([1, 2, 3, 4]));

    // Let a full target lifetime elapse without ever firing.
    for (let tick = 1; tick <= MULTI_LIFETIME_TICKS + 2; tick++) {
      adapter.onSimulationTick(
        createTick(tick),
        createAngleUnits(0),
        createPitchUnits(0),
      );
    }

    const metrics = adapter.computeMetrics(MULTI_LIFETIME_TICKS + 2);
    expect(metrics.misses).toBeGreaterThan(0);
    expect(metrics.shots).toBe(0);
    expect(metrics.hits).toBe(0);
  });

  it("never exceeds the maximum population while ticking", () => {
    const adapter = createMultiModeAdapter();
    adapter.initialize(createPrngV1([4, 4, 4, 4]));

    for (let tick = 1; tick <= 600; tick++) {
      adapter.onSimulationTick(
        createTick(tick),
        createAngleUnits(0),
        createPitchUnits(0),
      );
      expect(adapter.getRenderTargets().length).toBeLessThanOrEqual(
        MULTI_MAX_ACTIVE_TARGETS,
      );
    }
  });

  it("classifies a miss's direction via getMissBreakdown", () => {
    const adapter = createMultiModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);
    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(1),
      createAngleUnits(wrapYaw(target.xAngleUnits + 200_000)),
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

    adapter.initialize(createPrngV1([5, 6, 7, 8]));
    expect(adapter.computeMetrics(1).shots).toBe(0);
    expect(adapter.getRenderTargets().length).toBe(MULTI_MIN_ACTIVE_TARGETS);
  });
});
