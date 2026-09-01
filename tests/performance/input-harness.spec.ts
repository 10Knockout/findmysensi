import { describe, expect, it } from "vitest";
import {
  generateBurstRecoveryStream,
  generateHighPollStream,
  runInputPipelineBenchmark,
  SyntheticInputEvent,
} from "../../packages/performance/src/index.js";

function presetForRate(rate: number): 1000 | 2000 | 4000 | 8000 {
  if (rate >= 8000) return 8000;
  if (rate >= 4000) return 4000;
  if (rate >= 2000) return 2000;
  return 1000;
}

function distributeIntegerTotal(total: number, count: number): number[] {
  const sign = total < 0 ? -1 : 1;
  const absolute = Math.abs(total);
  const quotient = Math.floor(absolute / count);
  const remainder = absolute % count;
  return Array.from(
    { length: count },
    (_, index) => sign * (quotient + (index < remainder ? 1 : 0)),
  );
}

function createEquivalentIntentStream(rate: number): SyntheticInputEvent[] {
  const moveCount = rate;
  const dx = distributeIntegerTotal(8_000, moveCount);
  const dy = distributeIntegerTotal(-4_000, moveCount);
  const events: SyntheticInputEvent[] = [];
  const shotTimes = new Set([200, 400, 600, 800]);

  for (let index = 0; index < moveCount; index++) {
    const timeMs = moveCount === 1 ? 0 : (index * 999) / (moveCount - 1);
    for (const shotTime of shotTimes) {
      const previousTime =
        index === 0
          ? Number.NEGATIVE_INFINITY
          : ((index - 1) * 999) / (moveCount - 1);
      if (previousTime < shotTime && timeMs >= shotTime) {
        events.push({ kind: "shot", button: 0, timeMs: shotTime });
      }
    }
    events.push({
      kind: "move",
      dx: dx[index] ?? 0,
      dy: dy[index] ?? 0,
      timeMs,
    });
  }

  return events.sort((a, b) => a.timeMs - b.timeMs);
}

describe("Synthetic High-Poll Input Benchmark Harness (125 Hz – 8000 Hz)", () => {
  const rates = [125, 500, 1000, 2000, 4000, 8000] as const;

  for (const rate of rates) {
    it(`processes ${rate} Hz synthetic stream with zero loss and deterministic state`, async () => {
      const stream = generateHighPollStream({
        pollingRateHz: rate,
        durationMs: 1000,
        shotIntervalMs: 200,
      });
      const preset = presetForRate(rate);

      const result1 = await runInputPipelineBenchmark(stream, preset);
      const result2 = await runInputPipelineBenchmark(stream, preset);

      expect(result1.stateHashHex).toBe(result2.stateHashHex);
      expect(result1.finalYaw).toBe(result2.finalYaw);
      expect(result1.finalPitch).toBe(result2.finalPitch);
      expect(result1.shotTicks).toEqual(result2.shotTicks);

      expect(result1.lostTemporalPrecision).toBe(false);
      expect(result1.overflowCount).toBe(0);
      expect(result1.health.isStableForRanked).toBe(true);
      expect(result1.totalShots).toBe(5);
    });
  }

  it("produces equal gameplay state for equal intent from 125 through 8000 Hz", async () => {
    const equivalenceRates = [125, 1000, 2000, 4000, 8000] as const;
    const results = await Promise.all(
      equivalenceRates.map((rate) =>
        runInputPipelineBenchmark(
          createEquivalentIntentStream(rate),
          presetForRate(rate),
        ),
      ),
    );

    const reference = results[0]!;
    for (const result of results) {
      expect(result.finalYaw).toBe(reference.finalYaw);
      expect(result.finalPitch).toBe(reference.finalPitch);
      expect(result.totalShots).toBe(reference.totalShots);
      expect(result.shotTicks).toEqual(reference.shotTicks);
      expect(result.stateHashHex).toBe(reference.stateHashHex);
      expect(result.overflowCount).toBe(0);
      expect(result.lostTemporalPrecision).toBe(false);
    }
  });

  it("preserves a legitimate 45 ms movement-to-shot interval", async () => {
    const stream: SyntheticInputEvent[] = [
      { kind: "move", dx: 12, dy: -4, timeMs: 0 },
      { kind: "move", dx: 18, dy: 2, timeMs: 44 },
      { kind: "shot", button: 0, timeMs: 45 },
      { kind: "move", dx: -5, dy: 0, timeMs: 46 },
    ];

    const result = await runInputPipelineBenchmark(stream, 1000);

    expect(result.totalShots).toBe(1);
    expect(result.shotTicks).toEqual([5]);
    expect(result.overflowCount).toBe(0);
    expect(result.lostTemporalPrecision).toBe(false);
  });

  it("handles long-frame burst recovery without corrupting simulation state", async () => {
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
