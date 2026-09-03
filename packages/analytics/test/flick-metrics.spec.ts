import { describe, expect, it } from "vitest";
import { createFlickMetricsTracker } from "../src/flick/metrics.js";

describe("FlickMetricsTracker", () => {
  it("tracks hit/miss accuracy and acquisition times from recordShot, matching GridMetricsTracker", () => {
    const tracker = createFlickMetricsTracker();

    tracker.recordTargetSpawn(1, 0);
    tracker.recordTargetSpawn(2, 0);
    tracker.recordShot(40, 1);
    tracker.recordTargetSpawn(3, 40);
    tracker.recordShot(60, null);
    tracker.recordShot(90, 3);

    const metrics = tracker.computeMetrics(128);

    expect(metrics.shots).toBe(3);
    expect(metrics.hits).toBe(2);
    expect(metrics.misses).toBe(1);
    expect(metrics.acquisitionTicks).toEqual([40, 50]);
    expect(metrics.avgAcquisitionTicks).toBe(45);
    expect(metrics.killsPerSecond).toBe(2);
  });

  it("records an expiration as a miss without counting it as a shot", () => {
    const tracker = createFlickMetricsTracker();
    tracker.recordTargetSpawn(1, 0);

    tracker.recordExpiration(200);

    const metrics = tracker.computeMetrics(300);
    expect(metrics.misses).toBe(1);
    expect(metrics.shots).toBe(0);
    expect(metrics.hits).toBe(0);
    // Accuracy is computed against actual shots only; with zero shots taken,
    // an unclicked expiration must not manufacture a nonsensical accuracy.
    expect(metrics.accuracyPercentage).toBe(0);
  });

  it("mixes real shots and expirations correctly in the same run", () => {
    const tracker = createFlickMetricsTracker();
    tracker.recordTargetSpawn(1, 0);
    tracker.recordShot(10, 1); // 1 hit, 1 shot

    tracker.recordTargetSpawn(2, 0);
    tracker.recordExpiration(150); // 1 miss, 0 shots added

    const metrics = tracker.computeMetrics(300);
    expect(metrics.hits).toBe(1);
    expect(metrics.shots).toBe(1);
    expect(metrics.misses).toBe(1);
    // Accuracy reflects clicked shots only: 1 hit / 1 shot = 100%.
    expect(metrics.accuracyPercentage).toBe(100);
  });
});
