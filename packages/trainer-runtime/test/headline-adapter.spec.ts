import {
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
  wrapYaw,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import { createHeadlineModeAdapter } from "../src/headline-adapter.js";

describe("createHeadlineModeAdapter", () => {
  it("initializes one small target inside the head-height corridor", () => {
    const adapter = createHeadlineModeAdapter();
    const prng = createPrngV1([101, 202, 303, 404]);

    adapter.initialize(prng);

    const targets = adapter.getRenderTargets();
    expect(targets).toHaveLength(1);
    expect(targets[0]?.radiusAngleUnits).toBe(20_000);
    expect(Math.abs(targets[0]?.yAngleUnits ?? Infinity)).toBeLessThanOrEqual(
      90_000,
    );
  });

  it("records a hit and replaces the target", () => {
    const adapter = createHeadlineModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);
    const target = adapter.getRenderTargets()[0]!;

    adapter.onShot(
      createTick(5),
      createAngleUnits(target.xAngleUnits),
      createPitchUnits(target.yAngleUnits),
      prng,
    );

    expect(adapter.computeMetrics(6)).toMatchObject({
      hits: 1,
      shots: 1,
      misses: 0,
    });
    expect(adapter.getRenderTargets()).toHaveLength(1);
    expect(adapter.getRenderTargets()[0]?.id).not.toBe(target.id);
  });

  it("records a miss when no target is at the aim point", () => {
    const adapter = createHeadlineModeAdapter();
    const prng = createPrngV1([9, 8, 7, 6]);
    adapter.initialize(prng);

    adapter.onShot(
      createTick(1),
      createAngleUnits(0),
      createPitchUnits(500_000),
      prng,
    );

    expect(adapter.computeMetrics(2)).toMatchObject({
      hits: 0,
      shots: 1,
      misses: 1,
    });
  });

  it("uses Headline scoring", () => {
    const adapter = createHeadlineModeAdapter();
    const prng = createPrngV1([1, 1, 1, 1]);
    adapter.initialize(prng);
    const target = adapter.getRenderTargets()[0]!;

    adapter.onShot(
      createTick(1),
      createAngleUnits(target.xAngleUnits),
      createPitchUnits(target.yAngleUnits),
      prng,
    );

    expect(adapter.computeScore(adapter.computeMetrics(2)).score).toBe(1_200);
  });

  it("keeps simulation ticks as safe no-ops", () => {
    const adapter = createHeadlineModeAdapter();
    adapter.initialize(createPrngV1([1, 2, 3, 4]));

    expect(() =>
      adapter.onSimulationTick(
        createTick(0),
        createAngleUnits(0),
        createPitchUnits(0),
      ),
    ).not.toThrow();
  });

  it("classifies a miss's direction via getMissBreakdown", () => {
    const adapter = createHeadlineModeAdapter();
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

  it("resets metrics and target state on re-initialization", () => {
    const adapter = createHeadlineModeAdapter();
    const prngA = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prngA);
    adapter.onShot(
      createTick(1),
      createAngleUnits(0),
      createPitchUnits(500_000),
      prngA,
    );
    expect(adapter.computeMetrics(2).shots).toBe(1);

    adapter.initialize(createPrngV1([5, 6, 7, 8]));
    expect(adapter.computeMetrics(1).shots).toBe(0);
    expect(adapter.getRenderTargets()).toHaveLength(1);
  });
});
