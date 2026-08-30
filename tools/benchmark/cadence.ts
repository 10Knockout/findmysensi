import {
  createInitialSimulationState,
  createPrngV1,
  stepSimulation,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";

export interface CadenceBenchmarkResult {
  readonly cadenceHz: number;
  readonly tickIntervalMs: number;
  readonly simulatedSeconds: number;
  readonly totalTicks: number;
  readonly totalComputeMs: number;
  readonly avgTickComputeUs: number;
  readonly maxTickComputeUs: number;
  readonly p99TickComputeUs: number;
}

export function benchmarkCadence(
  cadenceHz: number,
  durationSeconds: number = 60,
): CadenceBenchmarkResult {
  const totalTicks = Math.floor(cadenceHz * durationSeconds);
  const tickIntervalMs = 1000 / cadenceHz;
  const tickTimesUs: number[] = new Array(totalTicks);

  let state = createInitialSimulationState(0, 0);
  const prng = createPrngV1([1, 2, 3, 4]);

  const startBenchmark = performance.now();

  for (let i = 0; i < totalTicks; i++) {
    const t0 = performance.now();
    // Simulate typical 128 Hz move and occasional shot
    const dx = prng.nextBoundedInt(500) - 250;
    const dy = prng.nextBoundedInt(500) - 250;

    state = stepSimulation(state, [
      {
        type: "move",
        tick: createTick(i),
        order: 0,
        dx,
        dy,
        meta: { source: "test" },
      },
    ]);

    const t1 = performance.now();
    tickTimesUs[i] = (t1 - t0) * 1000;
  }

  const endBenchmark = performance.now();
  const totalComputeMs = endBenchmark - startBenchmark;

  tickTimesUs.sort((a, b) => a - b);
  const avgUs = tickTimesUs.reduce((a, b) => a + b, 0) / totalTicks;
  const maxUs = tickTimesUs[totalTicks - 1] ?? 0;
  const p99Idx = Math.floor(totalTicks * 0.99);
  const p99Us = tickTimesUs[p99Idx] ?? 0;

  return Object.freeze({
    cadenceHz,
    tickIntervalMs: Math.round(tickIntervalMs * 1000) / 1000,
    simulatedSeconds: durationSeconds,
    totalTicks,
    totalComputeMs: Math.round(totalComputeMs * 100) / 100,
    avgTickComputeUs: Math.round(avgUs * 100) / 100,
    maxTickComputeUs: Math.round(maxUs * 100) / 100,
    p99TickComputeUs: Math.round(p99Us * 100) / 100,
  });
}
