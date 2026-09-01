import {
  CanonicalInputEvent,
  createMoveEvent,
  createInitialSimulationState,
  stepSimulation,
} from "@findmysensi/aim-core";
import {
  createDefaultProcessingPolicy,
  createInputRingBuffer,
  createRawInputBatchTarget,
  evaluateInputHealth,
  InputPathHealth,
  InputProcessingPolicy,
  InputProcessingPreset,
  reduceRawEvents,
  TickBucketer,
} from "@findmysensi/input-browser";
import {
  CanonicalStateV1,
  createTick,
  hashCanonicalStateV1,
  Tick,
} from "@findmysensi/protocol";
import { SyntheticInputEvent } from "./input-stream.js";

export interface BenchmarkResult {
  readonly stateHashHex: string;
  readonly highWaterMark: number;
  readonly overflowCount: number;
  readonly lostTemporalPrecision: boolean;
  readonly health: InputPathHealth;
  readonly totalEventsProcessed: number;
  readonly totalSegments: number;
  readonly totalShots: number;
  readonly shotTicks: readonly number[];
  readonly finalYaw: number;
  readonly finalPitch: number;
}

class StandardTickBucketer implements TickBucketer {
  private readonly intervalMs: number;

  constructor(tickRateHz: number = 128) {
    this.intervalMs = 1000 / tickRateHz;
  }

  public timeToTick(timeMs: number): Tick {
    return createTick(Math.floor(timeMs / this.intervalMs));
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeScale(value: number, gain: number): number {
  if (!Number.isSafeInteger(value) || !Number.isSafeInteger(gain) || gain <= 0) {
    throw new RangeError(`Unsafe benchmark input conversion: ${value} x ${gain}`);
  }
  const result = value * gain;
  if (!Number.isSafeInteger(result)) {
    throw new RangeError("Benchmark input conversion exceeds safe integer precision.");
  }
  return result;
}

function convertBrowserEventsToAngular(
  events: readonly CanonicalInputEvent[],
  gain: number,
): CanonicalInputEvent[] {
  return events.map((event) => {
    if (event.kind !== "move") return event;
    return createMoveEvent(
      event.tick,
      event.order,
      safeScale(event.dx, gain),
      safeScale(-event.dy, gain),
    );
  });
}

export async function runInputPipelineBenchmark(
  events: readonly SyntheticInputEvent[],
  preset: InputProcessingPreset = 1000,
  tickRateHz: number = 128,
  inputGainAngleUnitsPerUnit: number = 2_500,
): Promise<BenchmarkResult> {
  const policy: InputProcessingPolicy = createDefaultProcessingPolicy();
  const capacity = policy.getEffectiveCapacity(preset);
  const ringBuffer = createInputRingBuffer(capacity);
  const batchTarget = createRawInputBatchTarget(capacity);
  const clock = new StandardTickBucketer(tickRateHz);

  let simulationState = createInitialSimulationState(0, 0);

  let totalDrained = 0;
  let maxHighWaterMark = 0;
  let totalOverflowCount = 0;
  let anyLostPrecision = false;
  let totalSegments = 0;

  const tickIntervalMs = 1000 / tickRateHz;
  let currentSimTime = 0;
  let eventIdx = 0;

  while (eventIdx < events.length || ringBuffer.getHighWaterMark() > 0) {
    currentSimTime += tickIntervalMs;

    while (
      eventIdx < events.length &&
      (events[eventIdx]?.timeMs ?? 0) <= currentSimTime
    ) {
      const ev = events[eventIdx]!;
      switch (ev.kind) {
        case "move":
          ringBuffer.pushMove(ev.dx, ev.dy, ev.timeMs);
          break;
        case "shot":
          ringBuffer.pushShot(ev.button, ev.timeMs);
          break;
        case "invalidate":
          ringBuffer.pushInvalidate(ev.reasonCode, ev.timeMs);
          break;
      }
      eventIdx++;
    }

    const stats = ringBuffer.drainInto(batchTarget);
    totalDrained += stats.drainedCount;
    if (stats.highWaterMark > maxHighWaterMark) {
      maxHighWaterMark = stats.highWaterMark;
    }
    if (stats.overflowCount > 0) {
      totalOverflowCount += stats.overflowCount;
    }
    if (stats.lostTemporalPrecision) {
      anyLostPrecision = true;
    }

    if (batchTarget.count > 0) {
      const segments = reduceRawEvents(batchTarget, clock);
      totalSegments += segments.length;

      for (const segment of segments) {
        simulationState = stepSimulation(
          simulationState,
          convertBrowserEventsToAngular(
            segment.events,
            inputGainAngleUnitsPerUnit,
          ),
        );
      }
    }

    if (eventIdx >= events.length) break;
  }

  const finalDrainStats = {
    drainedCount: totalDrained,
    highWaterMark: maxHighWaterMark,
    overflowCount: totalOverflowCount,
    lostTemporalPrecision: anyLostPrecision,
  };

  const health = evaluateInputHealth(
    finalDrainStats,
    currentSimTime,
    preset,
    capacity,
  );

  const canonicalState: CanonicalStateV1 = {
    tick: simulationState.tick,
    yaw: simulationState.yaw,
    pitch: simulationState.pitch,
    valid: simulationState.valid,
    shotsCount: simulationState.shots.length,
  };

  const hashBytes = await hashCanonicalStateV1(canonicalState);

  return {
    stateHashHex: bytesToHex(hashBytes),
    highWaterMark: maxHighWaterMark,
    overflowCount: totalOverflowCount,
    lostTemporalPrecision: anyLostPrecision,
    health,
    totalEventsProcessed: totalDrained,
    totalSegments,
    totalShots: simulationState.shots.length,
    shotTicks: simulationState.shots.map((shot) => shot.tick),
    finalYaw: simulationState.yaw,
    finalPitch: simulationState.pitch,
  };
}
