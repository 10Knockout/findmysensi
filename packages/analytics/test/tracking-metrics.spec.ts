import { describe, expect, it } from "vitest";
import { createTrackingMetricsTracker } from "../src/tracking/metrics.js";

describe("TrackingMetricsTracker", () => {
  it("computes incremental on-target, average, and maximum error", () => {
    const tracker = createTrackingMetricsTracker();
    tracker.recordSample(10, true);
    tracker.recordSample(20, false);
    tracker.recordSample(31, true);

    expect(tracker.computeMetrics()).toEqual({
      onTargetTicks: 2,
      totalTicks: 3,
      onTargetPercentage: 66.67,
      averageErrorUnits: 20,
      maxErrorUnits: 31,
    });
  });
});
