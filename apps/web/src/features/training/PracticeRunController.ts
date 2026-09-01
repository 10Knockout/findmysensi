import {
  AngleUnits,
  clampPitch,
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
  createShotTracker,
  createSnapshotBuffer,
  findHitTarget,
  PitchUnits,
  PrngV1,
  SnapshotBuffer,
  wrapYaw,
} from "@findmysensi/aim-core";
import {
  createGridMetricsTracker,
  GridMetricsTracker,
} from "@findmysensi/analytics";
import {
  createInputRingBuffer,
  createRawInputBatchTarget,
  InputRingBuffer,
  RawInputBatchTarget,
  reduceRawEvents,
} from "@findmysensi/input-browser";
import { createTick, Tick } from "@findmysensi/protocol";
import { AimRenderer } from "@findmysensi/render-canvas";
import {
  GRID_DEV_V0_DEFINITION,
  GridScenarioEngine,
} from "@findmysensi/scenarios";
import { BASE_BROWSER_GAIN_ANGLE_UNITS } from "@findmysensi/sensitivity";
import { computeGridDevScore, ScoreResult } from "@findmysensi/scoring";
import {
  createFixedTickRunner,
  FixedTickRunner,
} from "../../trainer/fixed-tick-runner.js";
import { localPracticeHistory } from "./local-history.js";

export type PracticeRunState =
  "ready" | "playing" | "paused" | "completed" | "aborted";

export interface PracticeRunCallbacks {
  onStateChange: (state: PracticeRunState) => void;
  onTickProgress: (currentTick: number, totalTicks: number) => void;
  onScoreUpdate: (currentScore: number, hits: number, misses: number) => void;
  onComplete: (result: ScoreResult) => void;
}

export interface PracticeRunOptions {
  readonly durationTicks?: number;
  readonly inputGainAngleUnitsPerUnit?: number;
  readonly inputBufferCapacity?: number;
}

function safeScaledInputDelta(rawDelta: number, gain: number): number {
  if (!Number.isSafeInteger(rawDelta) || !Number.isSafeInteger(gain) || gain <= 0) {
    throw new RangeError(
      `Unsafe Gridshot input conversion: raw=${rawDelta}, gain=${gain}`,
    );
  }
  const scaled = rawDelta * gain;
  if (!Number.isSafeInteger(scaled)) {
    throw new RangeError("Gridshot input delta exceeds safe integer precision.");
  }
  return scaled;
}

export class PracticeRunController {
  private state: PracticeRunState = "ready";
  private runner: FixedTickRunner | null = null;
  private prng: PrngV1 | null = null;
  private engine: GridScenarioEngine;
  private metricsTracker: GridMetricsTracker;
  private shotTracker = createShotTracker();
  private ringBuffer: InputRingBuffer;
  private batchTarget: RawInputBatchTarget;
  private snapshotBuffer: SnapshotBuffer;
  private renderer: AimRenderer | null = null;
  private callbacks: PracticeRunCallbacks;

  private readonly totalDurationTicks: number;
  private readonly inputGainAngleUnitsPerUnit: number;
  private playerYaw: AngleUnits = createAngleUnits(0);
  private playerPitch: PitchUnits = createPitchUnits(0);
  private totalOverflowEvents: number = 0;
  private highWaterMark: number = 0;
  private exactReplayPreserved: boolean = true;

  constructor(
    callbacks: PracticeRunCallbacks,
    renderer?: AimRenderer,
    optionsOrDuration: PracticeRunOptions | number = {},
  ) {
    const options: PracticeRunOptions =
      typeof optionsOrDuration === "number"
        ? { durationTicks: optionsOrDuration }
        : optionsOrDuration;
    const capacity = options.inputBufferCapacity ?? 4096;
    const gain =
      options.inputGainAngleUnitsPerUnit ?? BASE_BROWSER_GAIN_ANGLE_UNITS;

    if (!Number.isSafeInteger(capacity) || capacity < 2) {
      throw new RangeError("Input buffer capacity must be an integer >= 2.");
    }
    if (!Number.isSafeInteger(gain) || gain <= 0) {
      throw new RangeError("Input gain must be a positive safe integer.");
    }

    this.callbacks = callbacks;
    this.renderer = renderer ?? null;
    this.totalDurationTicks =
      options.durationTicks ?? GRID_DEV_V0_DEFINITION.durationTicks;
    this.inputGainAngleUnitsPerUnit = gain;
    this.engine = new GridScenarioEngine(GRID_DEV_V0_DEFINITION);
    this.metricsTracker = createGridMetricsTracker();
    this.ringBuffer = createInputRingBuffer(capacity);
    this.batchTarget = createRawInputBatchTarget(capacity);
    this.snapshotBuffer = createSnapshotBuffer(32);
  }

  public getRingBuffer(): InputRingBuffer {
    return this.ringBuffer;
  }

  public getState(): PracticeRunState {
    return this.state;
  }

  public start(
    seed: [number, number, number, number] = [
      0x12345678, 0x9abcdef0, 0x0fedcba9, 0x87654321,
    ],
  ): void {
    this.prng = createPrngV1(seed);
    this.metricsTracker = createGridMetricsTracker();
    this.shotTracker.reset();
    this.playerYaw = createAngleUnits(0);
    this.playerPitch = createPitchUnits(0);
    this.totalOverflowEvents = 0;
    this.highWaterMark = 0;
    this.exactReplayPreserved = true;
    this.ringBuffer.reset();

    const initialTargets = this.engine.initialize(this.prng);
    for (const target of initialTargets) {
      this.metricsTracker.recordTargetSpawn(target.id, 0);
    }

    this.writeSnapshot(0);

    this.runner = createFixedTickRunner({
      tickRateHz: 128,
      maxCatchUpTicksPerFrame: 8,
      onTick: (tick) => this.handleSimulationTick(tick),
      onRender: () => {
        if (this.renderer) {
          this.renderer.render(this.snapshotBuffer.getLatest());
        }
      },
    });

    this.state = "playing";
    this.callbacks.onStateChange(this.state);
    this.runner.start();
  }

  public pause(): void {
    if (this.state === "playing" && this.runner) {
      this.runner.stop("manual_abort");
      this.state = "paused";
      this.callbacks.onStateChange(this.state);
    }
  }

  public resume(): void {
    if (this.state === "paused" && this.runner) {
      this.state = "playing";
      this.callbacks.onStateChange(this.state);
      this.runner.resume();
    }
  }

  public abort(): void {
    if (this.runner) {
      this.runner.stop("manual_abort");
    }
    this.state = "aborted";
    this.callbacks.onStateChange(this.state);
  }

  public onAnimationFrame(nowMs: number): void {
    if (this.state === "playing" && this.runner) {
      this.runner.onAnimationFrame(nowMs);
    }
  }

  private handleSimulationTick(tick: Tick): void {
    if (tick >= this.totalDurationTicks) {
      this.completeRun();
      return;
    }

    const stats = this.ringBuffer.drainInto(this.batchTarget);
    if (stats.overflowCount > 0) {
      this.totalOverflowEvents += stats.overflowCount;
    }
    if (stats.highWaterMark > this.highWaterMark) {
      this.highWaterMark = stats.highWaterMark;
    }
    if (stats.lostTemporalPrecision) {
      this.exactReplayPreserved = false;
    }

    const clock = {
      timeToTick: (timeMs: number) =>
        createTick(Math.floor(timeMs / (1000 / 128))),
    };

    if (this.batchTarget.count > 0) {
      const segments = reduceRawEvents(this.batchTarget, clock);
      for (const segment of segments) {
        for (const event of segment.events) {
          if (event.kind === "move") {
            const yawDelta = safeScaledInputDelta(
              event.dx,
              this.inputGainAngleUnitsPerUnit,
            );
            const pitchDelta = safeScaledInputDelta(
              event.dy,
              this.inputGainAngleUnitsPerUnit,
            );
            this.playerYaw = wrapYaw(this.playerYaw + yawDelta);
            this.playerPitch = clampPitch(this.playerPitch - pitchDelta);
          } else if (event.kind === "shot") {
            this.handlePlayerShot(tick);
          } else if (event.kind === "invalidate") {
            this.exactReplayPreserved = false;
          }
        }
      }
    }

    this.callbacks.onTickProgress(tick, this.totalDurationTicks);
    this.writeSnapshot(tick);
  }

  public handlePlayerShot(currentTick: number): void {
    if (!this.prng) return;

    const activeTargets = this.engine.getActiveTargets();
    const hitTarget = findHitTarget(
      this.playerYaw,
      this.playerPitch,
      activeTargets,
    );

    if (hitTarget) {
      this.metricsTracker.recordShot(currentTick, hitTarget.id);
      const newTarget = this.engine.onTargetHit(hitTarget.id, this.prng);
      if (newTarget) {
        this.metricsTracker.recordTargetSpawn(newTarget.id, currentTick);
      }
    } else {
      this.metricsTracker.recordShot(currentTick, null);
    }

    const currentMetrics = this.metricsTracker.computeMetrics(currentTick + 1);
    const devScore = computeGridDevScore(currentMetrics);
    this.callbacks.onScoreUpdate(
      devScore.score,
      currentMetrics.hits,
      currentMetrics.misses,
    );
  }

  private writeSnapshot(tick: number): void {
    this.snapshotBuffer.beginWrite(
      createTick(tick),
      this.playerYaw,
      this.playerPitch,
    );

    const active = this.engine.getActiveTargets();
    for (const target of active) {
      this.snapshotBuffer.writeTarget(
        target.id,
        target.xAngleUnits,
        target.yAngleUnits,
        target.radiusAngleUnits,
      );
    }

    this.snapshotBuffer.endWrite();
    this.snapshotBuffer.swap();
  }

  private completeRun(): void {
    if (this.runner) {
      this.runner.stop("completed");
    }
    this.state = "completed";
    this.callbacks.onStateChange(this.state);

    const finalMetrics = this.metricsTracker.computeMetrics(
      this.totalDurationTicks,
    );
    const finalScore = computeGridDevScore(finalMetrics);

    localPracticeHistory.save({
      id: `practice-${Date.now()}`,
      modeId: "grid",
      timestamp: Date.now(),
      score: finalScore.score,
      hits: finalMetrics.hits,
      shots: finalMetrics.shots,
      misses: finalMetrics.misses,
      accuracyPercentage: finalMetrics.accuracyPercentage,
      durationSeconds: Math.round(this.totalDurationTicks / 128),
      killsPerSecond: finalMetrics.killsPerSecond,
      exactReplayPreserved: this.exactReplayPreserved,
      inputOverflowEvents: this.totalOverflowEvents,
      inputHighWaterMark: this.highWaterMark,
    });

    this.callbacks.onComplete(finalScore);
  }
}
