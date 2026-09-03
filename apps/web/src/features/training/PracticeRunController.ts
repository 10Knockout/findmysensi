import {
  AngleUnits,
  clampPitch,
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
  createShotTracker,
  createSnapshotBuffer,
  FULL_TURN_UNITS,
  PitchUnits,
  PrngV1,
  SnapshotBuffer,
  wrapYaw,
} from "@findmysensi/aim-core";
import { GridMetrics } from "@findmysensi/analytics";
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
  BrowserInputGain,
  createBrowserInputScaler,
  DEFAULT_BROWSER_INPUT_GAIN,
  DeterministicBrowserInputScaler,
} from "@findmysensi/sensitivity";
import { ScoreResult } from "@findmysensi/scoring";
import {
  createGridModeAdapter,
  ModeRuntimeAdapter,
} from "@findmysensi/trainer-runtime";
import {
  createFixedTickRunner,
  FixedTickRunner,
} from "../../trainer/fixed-tick-runner.js";
import { localPracticeHistory } from "./local-history.js";
import { generateRunSeed } from "./seed.js";

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
  readonly inputGain?: BrowserInputGain;
  readonly inputBufferCapacity?: number;
}

export interface SensitivityInputVerificationSnapshot {
  readonly totalInputUnitsX: number;
  readonly totalInputUnitsY: number;
  readonly movementEventCount: number;
  readonly expectedYawDegrees: number;
  readonly expectedPitchDegrees: number;
  readonly actualEngineYawDegrees: number;
  readonly actualEnginePitchDegrees: number;
  readonly yawResidualFixedPointUnits: number;
  readonly pitchResidualFixedPointUnits: number;
}

export class PracticeRunController {
  private state: PracticeRunState = "ready";
  private runner: FixedTickRunner | null = null;
  private prng: PrngV1 | null = null;
  private readonly adapter: ModeRuntimeAdapter<GridMetrics>;
  private shotTracker = createShotTracker();
  private ringBuffer: InputRingBuffer;
  private batchTarget: RawInputBatchTarget;
  private snapshotBuffer: SnapshotBuffer;
  private renderer: AimRenderer | null = null;
  private callbacks: PracticeRunCallbacks;

  private readonly totalDurationTicks: number;
  private inputScaler: DeterministicBrowserInputScaler;
  private playerYaw: AngleUnits = createAngleUnits(0);
  private playerPitch: PitchUnits = createPitchUnits(0);
  private totalInputUnitsX: number = 0;
  private totalInputUnitsY: number = 0;
  private movementEventCount: number = 0;
  private cumulativeEngineYawAngleUnits: number = 0;
  private cumulativeEnginePitchAngleUnits: number = 0;
  private totalOverflowEvents: number = 0;
  private highWaterMark: number = 0;
  private exactReplayPreserved: boolean = true;
  private activeSeed: readonly [number, number, number, number] | null = null;

  constructor(
    callbacks: PracticeRunCallbacks,
    renderer?: AimRenderer,
    optionsOrDuration: PracticeRunOptions | number = {},
    adapter: ModeRuntimeAdapter<GridMetrics> = createGridModeAdapter(),
  ) {
    const options: PracticeRunOptions =
      typeof optionsOrDuration === "number"
        ? { durationTicks: optionsOrDuration }
        : optionsOrDuration;
    const capacity = options.inputBufferCapacity ?? 4096;
    const gain = options.inputGain ?? DEFAULT_BROWSER_INPUT_GAIN;

    if (!Number.isSafeInteger(capacity) || capacity < 2) {
      throw new RangeError("Input buffer capacity must be an integer >= 2.");
    }
    this.callbacks = callbacks;
    this.renderer = renderer ?? null;
    this.adapter = adapter;
    this.totalDurationTicks =
      options.durationTicks ?? adapter.definition.durationTicks;
    this.inputScaler = createBrowserInputScaler(gain);
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

  public getActiveSeed(): readonly [number, number, number, number] | null {
    return this.activeSeed;
  }

  public setInputGain(newGain: BrowserInputGain): void {
    this.inputScaler = createBrowserInputScaler(newGain);
  }

  public recordBrowserInputEvent(dx: number, dy: number): void {
    if (!Number.isSafeInteger(dx) || !Number.isSafeInteger(dy)) {
      throw new RangeError("Diagnostic browser input must use safe integers.");
    }
    this.totalInputUnitsX += dx;
    this.totalInputUnitsY += dy;
    this.movementEventCount++;
  }

  public getSensitivityInputVerificationSnapshot(): SensitivityInputVerificationSnapshot {
    const gain = this.inputScaler.getGain();
    const residuals = this.inputScaler.getResiduals();
    return Object.freeze({
      totalInputUnitsX: this.totalInputUnitsX,
      totalInputUnitsY: this.totalInputUnitsY,
      movementEventCount: this.movementEventCount,
      expectedYawDegrees: this.totalInputUnitsX * gain.degreesPerInputUnit,
      expectedPitchDegrees:
        this.totalInputUnitsY === 0
          ? 0
          : -this.totalInputUnitsY * gain.degreesPerInputUnit,
      actualEngineYawDegrees:
        (this.cumulativeEngineYawAngleUnits / FULL_TURN_UNITS) * 360,
      actualEnginePitchDegrees:
        (this.cumulativeEnginePitchAngleUnits / FULL_TURN_UNITS) * 360,
      yawResidualFixedPointUnits: residuals.yaw,
      pitchResidualFixedPointUnits: residuals.pitch,
    });
  }

  public start(seed?: readonly [number, number, number, number]): void {
    const effectiveSeed = seed ?? generateRunSeed();
    this.activeSeed = effectiveSeed;
    this.prng = createPrngV1(effectiveSeed);
    this.shotTracker.reset();
    this.playerYaw = createAngleUnits(0);
    this.playerPitch = createPitchUnits(0);
    this.inputScaler.reset();
    this.totalInputUnitsX = 0;
    this.totalInputUnitsY = 0;
    this.movementEventCount = 0;
    this.cumulativeEngineYawAngleUnits = 0;
    this.cumulativeEnginePitchAngleUnits = 0;
    this.totalOverflowEvents = 0;
    this.highWaterMark = 0;
    this.exactReplayPreserved = true;
    this.ringBuffer.reset();

    this.adapter.initialize(this.prng);

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
            const yawDelta = this.inputScaler.scaleYaw(event.dx);
            const pitchDelta = this.inputScaler.scalePitch(event.dy);
            this.playerYaw = wrapYaw(this.playerYaw + yawDelta);
            this.playerPitch = clampPitch(this.playerPitch - pitchDelta);
            this.cumulativeEngineYawAngleUnits += yawDelta;
            this.cumulativeEnginePitchAngleUnits -= pitchDelta;
          } else if (event.kind === "shot") {
            this.handlePlayerShot(tick);
          } else if (event.kind === "invalidate") {
            this.exactReplayPreserved = false;
          }
        }
      }
    }

    this.adapter.onSimulationTick(
      createTick(tick),
      this.playerYaw,
      this.playerPitch,
    );

    this.callbacks.onTickProgress(tick, this.totalDurationTicks);
    this.writeSnapshot(tick);
  }

  public handlePlayerShot(currentTick: number): void {
    if (!this.prng) return;

    const tick = createTick(currentTick);
    this.adapter.onShot(tick, this.playerYaw, this.playerPitch, this.prng);

    const currentMetrics = this.adapter.computeMetrics(currentTick + 1);
    const currentScore = this.adapter.computeScore(currentMetrics);
    this.callbacks.onScoreUpdate(
      currentScore.score,
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

    const active = this.adapter.getRenderTargets();
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

    const finalMetrics = this.adapter.computeMetrics(this.totalDurationTicks);
    const finalScore = this.adapter.computeScore(finalMetrics);

    // modeId is hardcoded here (rather than this.adapter.modeId) because
    // GridPracticeSummary is currently the only union member; this line
    // becomes mode-driven once a second variant ships (M4).
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
