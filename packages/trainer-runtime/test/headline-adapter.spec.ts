import {
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
  wrapYaw,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import {
  HEADLINE_ACTIVE_TARGETS,
  HEADLINE_DEPTH_RADIUS_UNITS,
  HEADLINE_MAX_PITCH_UNITS,
  HEADLINE_MAX_RESPAWN_TICKS,
  HEADLINE_MIN_PITCH_UNITS,
} from "@findmysensi/scenarios";
import { describe, expect, it } from "vitest";
import { createHeadlineModeAdapter } from "../src/headline-adapter.js";

/** Pitch well outside the head-height band, so a shot there always misses. */
const OFF_BAND_PITCH = 900_000;

describe("createHeadlineModeAdapter", () => {
  it("initializes four targets inside the head-height corridor", () => {
    const adapter = createHeadlineModeAdapter();
    adapter.initialize(createPrngV1([101, 202, 303, 404]));

    const targets = adapter.getRenderTargets();
    expect(targets).toHaveLength(HEADLINE_ACTIVE_TARGETS);

    const validRadii = new Set(Object.values(HEADLINE_DEPTH_RADIUS_UNITS));
    for (const target of targets) {
      expect(validRadii.has(target.radiusAngleUnits)).toBe(true);
      expect(target.yAngleUnits).toBeGreaterThanOrEqual(
        HEADLINE_MIN_PITCH_UNITS,
      );
      expect(target.yAngleUnits).toBeLessThanOrEqual(HEADLINE_MAX_PITCH_UNITS);
    }
  });

  it("records a hit and brings the lane back to four after the respawn delay", () => {
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
    // The replacement is queued, not instant.
    expect(adapter.getRenderTargets()).toHaveLength(
      HEADLINE_ACTIVE_TARGETS - 1,
    );

    for (let tick = 6; tick <= 6 + HEADLINE_MAX_RESPAWN_TICKS; tick++) {
      adapter.onSimulationTick(
        createTick(tick),
        createAngleUnits(0),
        createPitchUnits(0),
      );
    }

    expect(adapter.getRenderTargets()).toHaveLength(HEADLINE_ACTIVE_TARGETS);
  });

  it("records a miss when no target is at the aim point", () => {
    const adapter = createHeadlineModeAdapter();
    const prng = createPrngV1([9, 8, 7, 6]);
    adapter.initialize(prng);

    adapter.onShot(
      createTick(1),
      createAngleUnits(0),
      createPitchUnits(OFF_BAND_PITCH),
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

  it("advances the lane on simulation ticks without throwing", () => {
    const adapter = createHeadlineModeAdapter();
    adapter.initialize(createPrngV1([1, 2, 3, 4]));

    const before = adapter.getRenderTargets().map((t) => t.xAngleUnits);
    for (let tick = 1; tick <= 20; tick++) {
      expect(() =>
        adapter.onSimulationTick(
          createTick(tick),
          createAngleUnits(0),
          createPitchUnits(0),
        ),
      ).not.toThrow();
    }
    const after = adapter.getRenderTargets().map((t) => t.xAngleUnits);

    expect(after).not.toEqual(before);
    expect(adapter.getRenderTargets()).toHaveLength(HEADLINE_ACTIVE_TARGETS);
  });

  it("classifies a miss's direction via getMissBreakdown", () => {
    const adapter = createHeadlineModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);
    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(1),
      createAngleUnits(wrapYaw(target.xAngleUnits + 150_000)),
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
      createPitchUnits(OFF_BAND_PITCH),
      prngA,
    );
    expect(adapter.computeMetrics(2).shots).toBe(1);

    adapter.initialize(createPrngV1([5, 6, 7, 8]));
    expect(adapter.computeMetrics(1).shots).toBe(0);
    expect(adapter.getRenderTargets()).toHaveLength(HEADLINE_ACTIVE_TARGETS);
  });
});
