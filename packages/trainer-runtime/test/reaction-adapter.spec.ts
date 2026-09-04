import { createPrngV1 } from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { REACTION_MAX_DELAY_TICKS } from "@findmysensi/scenarios";
import { describe, expect, it } from "vitest";
import { createReactionModeAdapter } from "../src/reaction-adapter.js";

describe("Reaction adapter", () => {
  it("records acquisition from tick-based target appearance", () => {
    const adapter = createReactionModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);
    let tick = 0;
    while (
      adapter.getRenderTargets().length === 0 &&
      tick <= REACTION_MAX_DELAY_TICKS
    ) {
      adapter.onSimulationTick(createTick(tick), 0, 0);
      tick++;
    }
    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(tick + 10),
      target.xAngleUnits,
      target.yAngleUnits,
      prng,
    );

    const metrics = adapter.computeMetrics(128);
    expect(metrics.hits).toBe(1);
    expect(metrics.avgAcquisitionTicks).toBeGreaterThan(0);
  });
});
