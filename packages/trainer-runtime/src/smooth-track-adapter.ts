import type { AngleUnits, PitchUnits, PrngV1 } from "@findmysensi/aim-core";
import {
  createTrackingMetricsTracker,
  type TrackingMetrics,
  type TrackingMetricsTracker,
} from "@findmysensi/analytics";
import type { Tick } from "@findmysensi/protocol";
import {
  SMOOTH_TRACK_DEV_V0_DEFINITION,
  SmoothTrackScenarioEngine,
  type TargetSpawnSpec,
} from "@findmysensi/scenarios";
import {
  computeSmoothTrackDevScore,
  type SmoothTrackScoreResult,
} from "@findmysensi/scoring";
import type { ModeRuntimeAdapter } from "./adapter.js";

class SmoothTrackModeAdapter implements ModeRuntimeAdapter<TrackingMetrics> {
  public readonly modeId = "smooth-track";
  public readonly definition = SMOOTH_TRACK_DEV_V0_DEFINITION;
  private readonly engine = new SmoothTrackScenarioEngine();
  private metricsTracker: TrackingMetricsTracker =
    createTrackingMetricsTracker();
  private prng: PrngV1 | null = null;

  public initialize(prng: PrngV1): void {
    this.metricsTracker = createTrackingMetricsTracker();
    this.prng = prng;
    this.engine.initialize(prng);
  }

  public onSimulationTick(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
  ): void {
    if (!this.prng) return;
    const sample = this.engine.tick(tick, playerYaw, playerPitch, this.prng);
    this.metricsTracker.recordSample(sample.errorUnits, sample.onTarget);
  }

  public onShot(
    _tick: Tick,
    _playerYaw: AngleUnits,
    _playerPitch: PitchUnits,
    _prng: PrngV1,
  ): void {
    // Smooth Track is continuous; clicks do not affect the run.
  }

  public getRenderTargets(): readonly TargetSpawnSpec[] {
    return [this.engine.getTarget()];
  }

  public computeMetrics(_elapsedTicks: number): TrackingMetrics {
    return this.metricsTracker.computeMetrics();
  }

  public computeScore(metrics: TrackingMetrics): SmoothTrackScoreResult {
    return computeSmoothTrackDevScore(metrics);
  }
}

export function createSmoothTrackModeAdapter(): ModeRuntimeAdapter<TrackingMetrics> {
  return new SmoothTrackModeAdapter();
}
