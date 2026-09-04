import {
  AngleUnits,
  findHitTarget,
  PitchUnits,
  PrngV1,
} from "@findmysensi/aim-core";
import {
  createFlickMetricsTracker,
  FlickMetricsTracker,
  GridMetrics,
} from "@findmysensi/analytics";
import { Tick } from "@findmysensi/protocol";
import {
  STRAFE_DEV_V0_DEFINITION,
  StrafeScenarioEngine,
  TargetSpawnSpec,
} from "@findmysensi/scenarios";
import { computeStrafeDevScore, ScoreResult } from "@findmysensi/scoring";
import { ModeRuntimeAdapter } from "./adapter.js";

class StrafeModeAdapter implements ModeRuntimeAdapter<GridMetrics> {
  public readonly modeId = "strafe";
  public readonly definition = STRAFE_DEV_V0_DEFINITION;
  private readonly engine = new StrafeScenarioEngine(STRAFE_DEV_V0_DEFINITION);
  private metricsTracker: FlickMetricsTracker = createFlickMetricsTracker();

  public initialize(prng: PrngV1): void {
    this.metricsTracker = createFlickMetricsTracker();
    for (const target of this.engine.initialize(prng, 0)) {
      this.metricsTracker.recordTargetSpawn(target.id, 0);
    }
  }

  public onSimulationTick(
    tick: Tick,
    _playerYaw: AngleUnits,
    _playerPitch: PitchUnits,
  ): void {
    this.engine.tick(tick);
  }

  public onShot(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
    prng: PrngV1,
  ): void {
    const hitTarget = findHitTarget(
      playerYaw,
      playerPitch,
      this.engine.getPositionsForHitTest(),
    );
    if (!hitTarget) {
      this.metricsTracker.recordShot(tick, null);
      return;
    }

    this.metricsTracker.recordShot(tick, hitTarget.id);
    const replacement = this.engine.onTargetHit(hitTarget.id, prng, tick);
    if (replacement) {
      this.metricsTracker.recordTargetSpawn(replacement.id, tick);
    }
  }

  public getRenderTargets(): readonly TargetSpawnSpec[] {
    return this.engine.getActiveTargets();
  }

  public computeMetrics(elapsedTicks: number): GridMetrics {
    return this.metricsTracker.computeMetrics(elapsedTicks);
  }

  public computeScore(metrics: GridMetrics): ScoreResult {
    return computeStrafeDevScore(metrics);
  }
}

export function createStrafeModeAdapter(): ModeRuntimeAdapter<GridMetrics> {
  return new StrafeModeAdapter();
}
