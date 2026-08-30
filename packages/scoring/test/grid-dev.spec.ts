import { createGridMetricsTracker } from "@findmysensi/analytics";
import { describe, expect, it } from "vitest";
import { computeGridDevScore } from "../src/grid/dev-v0.js";

describe("Grid Practice Metrics & Dev Score", () => {
  it("tracks hit/miss accuracy and acquisition times accurately", () => {
    const tracker = createGridMetricsTracker();

    // Target 1 spawned at tick 0
    tracker.recordTargetSpawn(1, 0);
    // Target 2 spawned at tick 0
    tracker.recordTargetSpawn(2, 0);

    // Shot 1: hit target 1 at tick 40 (acquisition = 40 ticks)
    tracker.recordShot(40, 1);

    // Target 3 spawned at tick 40
    tracker.recordTargetSpawn(3, 40);

    // Shot 2: miss at tick 60
    tracker.recordShot(60, null);

    // Shot 3: hit target 3 at tick 90 (acquisition = 50 ticks)
    tracker.recordShot(90, 3);

    const metrics = tracker.computeMetrics(128); // 1 second total at 128 Hz

    expect(metrics.shots).toBe(3);
    expect(metrics.hits).toBe(2);
    expect(metrics.misses).toBe(1);
    expect(metrics.accuracyPercentage).toBeCloseTo(66.67, 1);
    expect(metrics.acquisitionTicks).toEqual([40, 50]);
    expect(metrics.avgAcquisitionTicks).toBe(45);
    expect(metrics.killsPerSecond).toBe(2);

    const scoreResult = computeGridDevScore(metrics);
    // 2 * 1000 - 1 * 200 = 1800
    expect(scoreResult.score).toBe(1800);
  });

  it("handles empty sessions without division by zero errors", () => {
    const tracker = createGridMetricsTracker();
    const metrics = tracker.computeMetrics(0);

    expect(metrics.shots).toBe(0);
    expect(metrics.hits).toBe(0);
    expect(metrics.misses).toBe(0);
    expect(metrics.accuracyPercentage).toBe(0);
    expect(metrics.avgAcquisitionTicks).toBe(0);

    const scoreResult = computeGridDevScore(metrics);
    expect(scoreResult.score).toBe(0);
  });

  it("clamps score to 0 when penalty exceeds hit score", () => {
    const tracker = createGridMetricsTracker();
    tracker.recordTargetSpawn(1, 0);
    tracker.recordShot(20, 1); // 1 hit (+1000)
    for (let i = 0; i < 10; i++) {
      tracker.recordShot(30 + i, null); // 10 misses (-2000)
    }

    const metrics = tracker.computeMetrics(128);
    const scoreResult = computeGridDevScore(metrics);
    expect(scoreResult.score).toBe(0);
  });
});
