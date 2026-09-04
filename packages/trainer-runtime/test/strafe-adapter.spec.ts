import {
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
  wrapYaw,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import { createStrafeModeAdapter } from "../src/strafe-adapter.js";

describe("createStrafeModeAdapter", () => {
  it("moves targets on every simulation tick", () => {
    const adapter = createStrafeModeAdapter();
    adapter.initialize(createPrngV1([1, 2, 3, 4]));
    const before = adapter
      .getRenderTargets()
      .map((target) => target.xAngleUnits);

    adapter.onSimulationTick(
      createTick(1),
      createAngleUnits(0),
      createPitchUnits(0),
    );

    expect(
      adapter.getRenderTargets().map((target) => target.xAngleUnits),
    ).not.toEqual(before);
  });

  it("hit-tests moved positions and replaces a hit target", () => {
    const adapter = createStrafeModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);
    adapter.onSimulationTick(
      createTick(1),
      createAngleUnits(0),
      createPitchUnits(0),
    );
    const target = adapter.getRenderTargets()[0]!;

    adapter.onShot(
      createTick(1),
      createAngleUnits(target.xAngleUnits),
      createPitchUnits(target.yAngleUnits),
      prng,
    );

    expect(adapter.computeMetrics(2)).toMatchObject({
      hits: 1,
      shots: 1,
      misses: 0,
    });
    expect(adapter.getRenderTargets()).toHaveLength(2);
  });

  it("records misses and uses Strafe scoring", () => {
    const adapter = createStrafeModeAdapter();
    const prng = createPrngV1([9, 8, 7, 6]);
    adapter.initialize(prng);
    adapter.onShot(
      createTick(1),
      createAngleUnits(0),
      createPitchUnits(1_000_000),
      prng,
    );
    expect(adapter.computeMetrics(2)).toMatchObject({ hits: 0, misses: 1 });

    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(2),
      createAngleUnits(target.xAngleUnits),
      createPitchUnits(target.yAngleUnits),
      prng,
    );
    expect(adapter.computeScore(adapter.computeMetrics(3)).score).toBe(950);
  });

  it("classifies a miss's direction via getMissBreakdown", () => {
    const adapter = createStrafeModeAdapter();
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

  it("resets metrics on re-initialization", () => {
    const adapter = createStrafeModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);
    adapter.onShot(
      createTick(1),
      createAngleUnits(0),
      createPitchUnits(1_000_000),
      prng,
    );
    adapter.initialize(createPrngV1([5, 6, 7, 8]));
    expect(adapter.computeMetrics(1).shots).toBe(0);
  });
});
