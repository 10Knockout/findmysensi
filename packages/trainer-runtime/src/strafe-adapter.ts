import type { AngleUnits, PitchUnits, PrngV1 } from "@findmysensi/aim-core";
import {
  createTrackingMetricsTracker,
  type TrackingMetrics,
  type TrackingMetricsTracker,
} from "@findmysensi/analytics";
import type { Tick } from "@findmysensi/protocol";
import {
  STRAFE_DEV_V0_DEFINITION,
  StrafeScenarioEngine,
  type TargetSpawnSpec,
} from "@findmysensi/scenarios";
import {
  computeStrafeDevScore,
  type StrafeScoreResult,
} from "@findmysensi/scoring";
import type { ModeRuntimeAdapter } from "./adapter.js";

/**
 * Strafe Track is a no-click tracking mode: the target cannot be destroyed,
 * and the run is scored purely on how long the crosshair overlapped it. It
 * deliberately does not implement MissBreakdownCapable -- there is no shot,
 * so there is no spatial miss to classify.
 */
class StrafeModeAdapter implements ModeRuntimeAdapter<TrackingMetrics> {
  public readonly modeId = "strafe";
  public readonly definition = STRAFE_DEV_V0_DEFINITION;

  private readonly engine = new StrafeScenarioEngine(STRAFE_DEV_V0_DEFINITION);
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
    // Strafe Track scores continuous overlap; clicks do not affect the run.
  }

  public getRenderTargets(): readonly TargetSpawnSpec[] {
    const target = this.engine.getTarget();
    return [
      {
        id: target.id,
        xAngleUnits: target.xAngleUnits,
        yAngleUnits: target.yAngleUnits,
        radiusAngleUnits: target.radiusAngleUnits,
      },
    ];
  }

  public computeMetrics(_elapsedTicks: number): TrackingMetrics {
    return this.metricsTracker.computeMetrics();
  }

  public computeScore(metrics: TrackingMetrics): StrafeScoreResult {
    return computeStrafeDevScore(metrics);
  }
}

export function createStrafeModeAdapter(): ModeRuntimeAdapter<TrackingMetrics> {
  return new StrafeModeAdapter();
}
