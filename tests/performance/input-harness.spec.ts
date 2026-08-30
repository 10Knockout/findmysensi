import { describe, expect, it } from "vitest";
import {
  generateBurstRecoveryStream,
  generateHighPollStream,
  runInputPipelineBenchmark,
} from "../../packages/performance/src/index.js";

describe("Synthetic High-Poll Input Benchmark Harness (125 Hz – 8000 Hz)", () => {
  const rates = [125, 500, 1000, 2000, 4000, 8000] as const;

  for (const rate of rates) {
    it(`processes ${rate} Hz synthetic stream with zero loss and 100% deterministic state hash`, async () => {
      // 1-second duration with shots every 200ms
      const stream = generateHighPollStream({
        pollingRateHz: rate,
        durationMs: 1000,
        shotIntervalMs: 200,
      });

      // Run 1
      const result1 = await runInputPipelineBenchmark(
        stream,
        rate >= 8000 ? 8000 : rate >= 4000 ? 4000 : rate >= 2000 ? 2000 : 1000,
      );

      // Run 2 (repeated identical run)
      const result2 = await runInputPipelineBenchmark(
        stream,
        rate >= 8000 ? 8000 : rate >= 4000 ? 4000 : rate >= 2000 ? 2000 : 1000,
      );

      // Invariant: Exact bit-identical state hash across runs
      expect(result1.stateHashHex).toBe(result2.stateHashHex);
      expect(result1.finalYaw).toBe(result2.finalYaw);
      expect(result1.finalPitch).toBe(result2.finalPitch);

      // Invariant: Zero lost precision and 100% stable health
      expect(result1.lostTemporalPrecision).toBe(false);
      expect(result1.overflowCount).toBe(0);
      expect(result1.health.isStableForRanked).toBe(true);

      // Invariant: All 5 scheduled shots captured causally
      expect(result1.totalShots).toBe(5);
    });
  }

  it("handles long-frame burst recovery without corrupting simulation state", async () => {
    // 1000ms total: 200ms normal 1000 Hz, then 100ms burst at 8000 Hz, then normal 1000 Hz
    const burstStream = generateBurstRecoveryStream({
      baseRateHz: 1000,
      burstRateHz: 8000,
      burstStartMs: 200,
      burstDurationMs: 100,
      totalDurationMs: 1000,
    });

    const result = await runInputPipelineBenchmark(burstStream, 8000);

    expect(result.lostTemporalPrecision).toBe(false);
    expect(result.overflowCount).toBe(0);
    expect(result.health.isStableForRanked).toBe(true);
    expect(result.totalEventsProcessed).toBeGreaterThan(1500);
  });
});
