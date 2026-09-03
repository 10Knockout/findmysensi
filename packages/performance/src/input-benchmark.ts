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
import {
  BrowserInputGain,
  createBrowserInputScaler,
  DEFAULT_BROWSER_INPUT_GAIN,
} from "@findmysensi/sensitivity";
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

function convertBrowserEventsToAngular(
  events: readonly CanonicalInputEvent[],
  scaler: ReturnType<typeof createBrowserInputScaler>,
): CanonicalInputEvent[] {
  return events.map((event) => {
    if (event.kind !== "move") return event;
    return createMoveEvent(
      event.tick,
      event.order,
      scaler.scaleYaw(event.dx),
      scaler.scalePitch(-event.dy),
    );
  });
}

export async function runInputPipelineBenchmark(
  events: readonly SyntheticInputEvent[],
  preset: InputProcessingPreset = 1000,
  tickRateHz: number = 128,
  inputGain: BrowserInputGain = DEFAULT_BROWSER_INPUT_GAIN,
): Promise<BenchmarkResult> {
  const policy: InputProcessingPolicy = createDefaultProcessingPolicy();
  const capacity = policy.getEffectiveCapacity(preset);
  const ringBuffer = createInputRingBuffer(capacity);
  const batchTarget = createRawInputBatchTarget(capacity);
  const clock = new StandardTickBucketer(tickRateHz);
  const inputScaler = createBrowserInputScaler(inputGain);

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
          convertBrowserEventsToAngular(segment.events, inputScaler),
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
