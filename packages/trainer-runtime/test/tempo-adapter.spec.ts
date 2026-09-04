import { createPrngV1 } from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { TICKS_PER_BEAT } from "@findmysensi/scenarios";
import { describe, expect, it } from "vitest";
import { createTempoModeAdapter } from "../src/tempo-adapter.js";

describe("Tempo runtime adapter", () => {
  it("judges aimed shots and records misses for unaimed shots", () => {
    const adapter = createTempoModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);
    adapter.onSimulationTick(createTick(TICKS_PER_BEAT - 20), 0, 0);

    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(TICKS_PER_BEAT),
      target.xAngleUnits,
      target.yAngleUnits,
      prng,
    );
    adapter.onShot(createTick(TICKS_PER_BEAT + 1), 0, 0, prng);

    const metrics = adapter.computeMetrics(TICKS_PER_BEAT + 2);
    expect(metrics.perfect).toBe(1);
    expect(metrics.miss).toBe(1);
    expect(metrics.totalBeats).toBe(2);
  });

  it("applies the ten-perfect streak bonus", () => {
    const adapter = createTempoModeAdapter();
    const prng = createPrngV1([5, 6, 7, 8]);
    adapter.initialize(prng);

    for (let beat = 1; beat <= 10; beat++) {
      const beatTick = beat * TICKS_PER_BEAT;
      adapter.onSimulationTick(createTick(beatTick - 20), 0, 0);
      const target = adapter.getRenderTargets()[0]!;
      adapter.onShot(
        createTick(beatTick),
        target.xAngleUnits,
        target.yAngleUnits,
        prng,
      );
    }

    const metrics = adapter.computeMetrics(10 * TICKS_PER_BEAT);
    expect(metrics.perfect).toBe(10);
    expect(adapter.computeScore(metrics).score).toBe(12_500);
  });

  it("records an expired beat once", () => {
    const adapter = createTempoModeAdapter();
    adapter.initialize(createPrngV1([9, 10, 11, 12]));
    adapter.onSimulationTick(createTick(TICKS_PER_BEAT - 20), 0, 0);
    adapter.onSimulationTick(createTick(TICKS_PER_BEAT + 21), 0, 0);
    adapter.onSimulationTick(createTick(TICKS_PER_BEAT + 22), 0, 0);

    expect(adapter.computeMetrics(TICKS_PER_BEAT + 23).miss).toBe(1);
  });
});
