import { describe, expect, it } from "vitest";
import { createSwitchTrackMetricsTracker } from "../src/switch-track/metrics.js";

describe("SwitchTrackMetricsTracker", () => {
  it("combines tracking, acquisition, and switch metrics", () => {
    const tracker = createSwitchTrackMetricsTracker();
    tracker.recordSample(10, true);
    tracker.recordSample(30, false);
    tracker.recordAcquisition(12);
    tracker.recordAcquisition(20);
    tracker.recordSwitch();

    expect(tracker.computeMetrics()).toEqual({
      switchesCompleted: 1,
      onTargetTicks: 1,
      totalTicks: 2,
      onTargetPercentage: 50,
      averageErrorUnits: 20,
      maxErrorUnits: 30,
      averageAcquisitionTicks: 16,
    });
  });
});
