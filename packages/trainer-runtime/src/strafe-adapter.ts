import {
  AngleUnits,
  findHitTarget,
  findNearestTarget,
  PitchUnits,
  PrngV1,
} from "@findmysensi/aim-core";
import {
  classifyMiss,
  createFlickMetricsTracker,
  FlickMetricsTracker,
  GridMetrics,
  MissDirection,
} from "@findmysensi/analytics";
import { Tick } from "@findmysensi/protocol";
import {
  STRAFE_DEV_V0_DEFINITION,
  StrafeScenarioEngine,
  TargetSpawnSpec,
} from "@findmysensi/scenarios";
import { computeStrafeDevScore, ScoreResult } from "@findmysensi/scoring";
import { MissBreakdownCapable, ModeRuntimeAdapter } from "./adapter.js";

function emptyMissBreakdown(): Record<MissDirection, number> {
  return { left: 0, right: 0, up: 0, down: 0, unclear: 0 };
}

class StrafeModeAdapter
  implements ModeRuntimeAdapter<GridMetrics>, MissBreakdownCapable
{
  public readonly modeId = "strafe";
  public readonly definition = STRAFE_DEV_V0_DEFINITION;
  private readonly engine = new StrafeScenarioEngine(STRAFE_DEV_V0_DEFINITION);
  private metricsTracker: FlickMetricsTracker = createFlickMetricsTracker();
  private missBreakdown: Record<MissDirection, number> = emptyMissBreakdown();

  public initialize(prng: PrngV1): void {
    this.metricsTracker = createFlickMetricsTracker();
    this.missBreakdown = emptyMissBreakdown();
    for (const target of this.engine.initialize(prng, 0)) {
      this.metricsTracker.recordTargetSpawn(target.id, 0);
    }
  }

  public getMissBreakdown(): Readonly<Record<MissDirection, number>> {
    return this.missBreakdown;
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
    const positions = this.engine.getPositionsForHitTest();
    const hitTarget = findHitTarget(playerYaw, playerPitch, positions);
    if (!hitTarget) {
      this.metricsTracker.recordShot(tick, null);
      const nearest = findNearestTarget(playerYaw, playerPitch, positions);
      if (nearest) {
        const { direction } = classifyMiss(
          nearest.dx,
          nearest.dy,
          nearest.target.radiusAngleUnits,
        );
        this.missBreakdown[direction]++;
      }
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
