import { createPrngV1 } from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import { createSmoothTrackModeAdapter } from "../src/smooth-track-adapter.js";

describe("Smooth Track runtime adapter", () => {
  it("records continuous tracking samples and scores them", () => {
    const adapter = createSmoothTrackModeAdapter();
    adapter.initialize(createPrngV1([1, 2, 3, 4]));

    const target = adapter.getRenderTargets()[0]!;
    adapter.onSimulationTick(
      createTick(0),
      target.xAngleUnits,
      target.yAngleUnits,
    );
    adapter.onSimulationTick(createTick(1), 5_000_000, 5_000_000);

    const metrics = adapter.computeMetrics(2);
    expect(metrics.totalTicks).toBe(2);
    expect(metrics.onTargetTicks).toBe(1);
    expect(metrics.onTargetPercentage).toBe(50);
    expect(metrics.maxErrorUnits).toBeGreaterThan(0);
    expect(adapter.computeScore(metrics).score).toBeGreaterThan(0);
  });

  it("renders wrapped yaw coordinates", () => {
    const adapter = createSmoothTrackModeAdapter();
    adapter.initialize(createPrngV1([1, 2, 3, 4]));
    adapter.onSimulationTick(createTick(2_000), 0, 0);

    expect(adapter.getRenderTargets()[0]!.xAngleUnits).toBeGreaterThanOrEqual(
      0,
    );
  });
});
