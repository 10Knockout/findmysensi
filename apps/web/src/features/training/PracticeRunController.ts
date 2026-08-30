import {
  clampPitch,
  createPrngV1,
  createShotTracker,
  createSnapshotBuffer,
  findHitTarget,
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

  private totalDurationTicks: number;
  private playerYaw: number = 0;
  private playerPitch: number = 0;

  constructor(
    callbacks: PracticeRunCallbacks,
    renderer?: AimRenderer,
    durationTicks: number = GRID_DEV_V0_DEFINITION.durationTicks,
  ) {
    this.callbacks = callbacks;
    this.renderer = renderer ?? null;
    this.totalDurationTicks = durationTicks;
    this.engine = new GridScenarioEngine(GRID_DEV_V0_DEFINITION);
    this.metricsTracker = createGridMetricsTracker();
    this.ringBuffer = createInputRingBuffer(4096);
    this.batchTarget = createRawInputBatchTarget(4096);
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
    this.playerYaw = 0;
    this.playerPitch = 0;

    const initialTargets = this.engine.initialize(this.prng);
    for (const t of initialTargets) {
      this.metricsTracker.recordTargetSpawn(t.id, 0);
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
      this.runner.start();
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

    // 1. Drain input
    this.ringBuffer.drainInto(this.batchTarget);

    const clock = {
      timeToTick: (timeMs: number) =>
        createTick(Math.floor(timeMs / (1000 / 128))),
    };

    if (this.batchTarget.count > 0) {
      const segments = reduceRawEvents(this.batchTarget, clock);
      for (const seg of segments) {
        for (const ev of seg.events) {
          if (ev.kind === "move") {
            this.playerYaw += ev.dx;
            this.playerPitch += ev.dy;
          } else if (ev.kind === "shot") {
            this.handlePlayerShot(tick);
          }
        }
      }
    }

    // 2. Report progress
    this.callbacks.onTickProgress(tick, this.totalDurationTicks);

    // 3. Write snapshot
    this.writeSnapshot(tick);
  }

  public handlePlayerShot(currentTick: number): void {
    if (!this.prng) return;

    const yawUnits = wrapYaw(this.playerYaw);
    const pitchUnits = clampPitch(this.playerPitch);

    const activeTargets = this.engine.getActiveTargets();
    const hitTarget = findHitTarget(yawUnits, pitchUnits, activeTargets);

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
    const yawUnits = wrapYaw(this.playerYaw);
    const pitchUnits = clampPitch(this.playerPitch);

    this.snapshotBuffer.beginWrite(createTick(tick), yawUnits, pitchUnits);

    const active = this.engine.getActiveTargets();
    for (const t of active) {
      this.snapshotBuffer.writeTarget(
        t.id,
        t.xAngleUnits,
        t.yAngleUnits,
        t.radiusAngleUnits,
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

    // Save to privacy-safe local practice history
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
    });

    this.callbacks.onComplete(finalScore);
  }
}
