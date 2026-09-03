import {
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import { createGridModeAdapter } from "../src/grid-adapter.js";

describe("createGridModeAdapter", () => {
  it("initializes exactly 3 targets matching GridScenarioEngine's own determinism", () => {
    const adapter = createGridModeAdapter();
    const prng = createPrngV1([101, 202, 303, 404]);

    adapter.initialize(prng);

    const targets = adapter.getRenderTargets();
    expect(targets.length).toBe(3);
    expect(targets.every((t) => t.radiusAngleUnits === 68_000)).toBe(true);
  });

  it("records a hit via onShot and reflects it in computeMetrics", () => {
    const adapter = createGridModeAdapter();
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

    // Still exactly 3 active targets after a hit-and-replace.
    expect(adapter.getRenderTargets().length).toBe(3);
  });

  it("records a miss via onShot when no target is at the aim point", () => {
    const adapter = createGridModeAdapter();
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

  it("computeScore matches computeGridDevScore's own formula for the same metrics", () => {
    const adapter = createGridModeAdapter();
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
    expect(result.score).toBe(1000); // 1 hit, 0 misses: 1*1000 - 0*200
  });

  it("onSimulationTick is a safe no-op for the click-discrete Grid mode", () => {
    const adapter = createGridModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);
    expect(() =>
      adapter.onSimulationTick(
        createTick(0),
        createAngleUnits(0),
        createPitchUnits(0),
      ),
    ).not.toThrow();
  });

  it("re-initializing resets metrics and target state for a second run", () => {
    const adapter = createGridModeAdapter();
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
