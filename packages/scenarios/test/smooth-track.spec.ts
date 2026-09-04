import { createPrngV1, FULL_TURN_UNITS } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import { SmoothTrackScenarioEngine } from "../src/smooth-track/dev-v0.js";

describe("Smooth Track Scenario (dev-v0)", () => {
  const seed: [number, number, number, number] = [42, 84, 126, 168];

  it("initializes a single target at the Lissajous origin", () => {
    const engine = new SmoothTrackScenarioEngine();
    const prng = createPrngV1(seed);

    const target = engine.initialize(prng);
    expect(target.id).toBe(1);
    // At t=0, sin(0)=0, so x and y should be near 0
    expect(target.xAngleUnits).toBe(0);
  });

  it("target moves along a smooth path over ticks", () => {
    const engine = new SmoothTrackScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng);

    const positions: Array<{ x: number; y: number }> = [];
    for (let tick = 0; tick < 100; tick += 10) {
      const pos = engine.computePosition(tick);
      expect(pos.xAngleUnits).toBeGreaterThanOrEqual(0);
      expect(pos.xAngleUnits).toBeLessThan(FULL_TURN_UNITS);
      positions.push({ x: pos.xAngleUnits, y: pos.yAngleUnits });
    }

    // Target should move (not all positions identical)
    const uniqueX = new Set(positions.map((p) => p.x));
    expect(uniqueX.size).toBeGreaterThan(1);
  });

  it("records on-target ticks and angular error", () => {
    const engine = new SmoothTrackScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng);

    // First compute position at tick 10, then pass those exact coords
    const pos10 = engine.computePosition(10);
    const result = engine.tick(10, pos10.xAngleUnits, pos10.yAngleUnits);
    expect(result.onTarget).toBe(true);
    expect(result.errorUnits).toBe(0);

    // Tick far from target → off target
    const result2 = engine.tick(11, 9999999, 9999999);
    expect(result2.onTarget).toBe(false);
    expect(result2.errorUnits).toBeGreaterThan(0);
  });

  it("produces tracking metrics", () => {
    const engine = new SmoothTrackScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng);

    // 5 on-target ticks, 5 off-target ticks
    for (let i = 0; i < 5; i++) {
      const target = engine.computePosition(i);
      engine.tick(i, target.xAngleUnits, target.yAngleUnits);
    }
    for (let i = 5; i < 10; i++) {
      engine.tick(i, 9999999, 9999999);
    }

    const metrics = engine.getTrackingMetrics();
    expect(metrics.onTargetTicks).toBe(5);
    expect(metrics.totalTicks).toBe(10);
    expect(metrics.onTargetPercentage).toBe(50);
    expect(metrics.averageErrorUnits).toBeGreaterThan(0);
  });

  it("is deterministic — Lissajous path is pure function of tick", () => {
    const engine1 = new SmoothTrackScenarioEngine();
    const prng1 = createPrngV1(seed);
    engine1.initialize(prng1);

    const engine2 = new SmoothTrackScenarioEngine();
    const prng2 = createPrngV1(seed);
    engine2.initialize(prng2);

    for (let tick = 0; tick < 200; tick += 5) {
      const pos1 = engine1.computePosition(tick);
      const pos2 = engine2.computePosition(tick);
      expect(pos1.xAngleUnits).toBe(pos2.xAngleUnits);
      expect(pos1.yAngleUnits).toBe(pos2.yAngleUnits);
    }
  });
});
