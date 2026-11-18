import {
  createAngleUnits,
  findHitTarget,
  shortestSignedAngleDelta,
  type AimCorridorView,
  type AngleUnits,
  type PitchUnits,
  type PrngV1,
} from "@findmysensi/aim-core";
import {
  createFlickMetricsTracker,
  type GridMetrics,
} from "@findmysensi/analytics";
import type { Tick } from "@findmysensi/protocol";
import {
  PATHLINE_CORRIDOR_RADIUS,
  PATHLINE_DEV_V0_ENTRY,
  PATHLINE_MODE_ID,
  PathlineScenario,
  type TargetSpawnSpec,
} from "@findmysensi/scenarios";
import { computePathlineScore } from "@findmysensi/scoring";
import type { ModeRuntimeAdapter, RuntimeScoreResult } from "./adapter.js";

export interface PathlineProgress {
  readonly segmentsCompleted: number;
  readonly cleanSegments: number;
  readonly corridorTicks: number;
  readonly pathTicks: number;
}

export type PathlineMetrics = GridMetrics & PathlineProgress;

class PathlineModeAdapter implements ModeRuntimeAdapter<PathlineMetrics> {
  public readonly modeId = PATHLINE_MODE_ID;
  public readonly definition = PATHLINE_DEV_V0_ENTRY.definition;
  private readonly scenario = new PathlineScenario();
  private tracker = createFlickMetricsTracker();
  private start: TargetSpawnSpec | null = null;
  private end: TargetSpawnSpec | null = null;
  private targets: readonly TargetSpawnSpec[] = [];
  private started = false;
  private leftCorridor = false;
  private segmentsCompleted = 0;
  private cleanSegments = 0;
  private corridorTicks = 0;
  private pathTicks = 0;

  public initialize(prng: PrngV1): void {
    this.tracker = createFlickMetricsTracker();
    this.started = false;
    this.leftCorridor = false;
    this.segmentsCompleted = 0;
    this.cleanSegments = 0;
    this.corridorTicks = 0;
    this.pathTicks = 0;
    this.start = this.scenario.reset();
    this.end = this.scenario.next(prng);
    this.activate(this.start, 0);
  }

  public onAimMove(yaw: AngleUnits, pitch: PitchUnits): void {
    if (
      this.started &&
      !this.leftCorridor &&
      !this.isInsideCorridor(yaw, pitch)
    ) {
      this.leftCorridor = true;
    }
  }

  public onSimulationTick(
    tick: Tick,
    yaw: AngleUnits,
    pitch: PitchUnits,
  ): void {
    if (!this.started) return;
    this.pathTicks++;
    if (this.isInsideCorridor(yaw, pitch)) {
      this.corridorTicks++;
    } else {
      this.leftCorridor = true;
    }
    this.restartFailedSegment(tick);
  }

  public onShot(
    tick: Tick,
    yaw: AngleUnits,
    pitch: PitchUnits,
    prng: PrngV1,
  ): void {
    if (!this.start || !this.end) return;
    this.onAimMove(yaw, pitch);
    this.restartFailedSegment(tick);
    const hit = findHitTarget(yaw, pitch, this.targets);
    this.tracker.recordShot(tick, hit?.id ?? null);
    if (!hit) return;

    if (this.started) {
      this.segmentsCompleted++;
      this.cleanSegments++;
      this.start = this.end;
      this.end = this.scenario.next(prng);
    }
    this.started = true;
    this.leftCorridor = false;
    this.activate(this.end, tick);
  }

  public getAimCorridor(): AimCorridorView | null {
    const { start, end } = this;
    if (!start || !end) return null;
    const unlit = this.started ? start : end;
    return {
      startYaw: start.xAngleUnits,
      startPitch: start.yAngleUnits,
      endYaw: end.xAngleUnits,
      endPitch: end.yAngleUnits,
      radiusUnits: PATHLINE_CORRIDOR_RADIUS,
      unlitEndpointYaw: unlit.xAngleUnits,
      unlitEndpointPitch: unlit.yAngleUnits,
      targetRadiusUnits: unlit.radiusAngleUnits,
      leftCorridor: this.leftCorridor,
    };
  }

  public getRenderTargets(): readonly TargetSpawnSpec[] {
    return this.targets;
  }

  public computeMetrics(elapsedTicks: number): PathlineMetrics {
    return {
      ...this.tracker.computeMetrics(elapsedTicks),
      segmentsCompleted: this.segmentsCompleted,
      cleanSegments: this.cleanSegments,
      corridorTicks: this.corridorTicks,
      pathTicks: this.pathTicks,
    };
  }

  public computeScore(
    metrics: PathlineMetrics,
  ): RuntimeScoreResult<PathlineMetrics> {
    return { metrics, score: computePathlineScore(metrics) };
  }

  private activate(target: TargetSpawnSpec, tick: number): void {
    this.targets = [target];
    this.tracker.recordTargetSpawn(target.id, tick);
  }

  private restartFailedSegment(tick: Tick): void {
    if (!this.started || !this.leftCorridor || !this.start) return;
    this.started = false;
    this.activate(this.start, tick);
  }

  private isInsideCorridor(yaw: AngleUnits, pitch: PitchUnits): boolean {
    const { start, end } = this;
    if (!start || !end) return false;
    const startYaw = createAngleUnits(start.xAngleUnits);
    const x = shortestSignedAngleDelta(startYaw, yaw);
    const y = pitch - start.yAngleUnits;
    const dx = shortestSignedAngleDelta(
      startYaw,
      createAngleUnits(end.xAngleUnits),
    );
    const dy = end.yAngleUnits - start.yAngleUnits;
    const projection = (x * dx + y * dy) / (dx * dx + dy * dy);
    const fraction = Math.min(1, Math.max(0, projection));
    return (
      (x - fraction * dx) ** 2 + (y - fraction * dy) ** 2 <=
      PATHLINE_CORRIDOR_RADIUS ** 2
    );
  }
}

export function createPathlineModeAdapter(): ModeRuntimeAdapter<PathlineMetrics> {
  return new PathlineModeAdapter();
}
