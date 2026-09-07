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
  TURN180_DEV_V0_DEFINITION,
  TargetSpawnSpec,
  Turn180ScenarioEngine,
} from "@findmysensi/scenarios";
import {
  computeTurn180DevScore,
  Turn180ScoreResult,
} from "@findmysensi/scoring";
import { MissBreakdownCapable, ModeRuntimeAdapter } from "./adapter.js";

function emptyMissBreakdown(): Record<MissDirection, number> {
  return { left: 0, right: 0, up: 0, down: 0, unclear: 0 };
}

class Turn180ModeAdapter
  implements ModeRuntimeAdapter<GridMetrics>, MissBreakdownCapable
{
  public readonly modeId = "turn180";
  public readonly definition = TURN180_DEV_V0_DEFINITION;

  private readonly engine = new Turn180ScenarioEngine(
    TURN180_DEV_V0_DEFINITION,
  );
  private metricsTracker: FlickMetricsTracker = createFlickMetricsTracker();
  private missBreakdown: Record<MissDirection, number> = emptyMissBreakdown();

  public initialize(prng: PrngV1): void {
    this.metricsTracker = createFlickMetricsTracker();
    this.missBreakdown = emptyMissBreakdown();
    const target = this.engine.initialize(prng);
    this.metricsTracker.recordTargetSpawn(target.id, 0);
  }

  public getMissBreakdown(): Readonly<Record<MissDirection, number>> {
    return this.missBreakdown;
  }

  public onSimulationTick(
    _tick: Tick,
    _playerYaw: AngleUnits,
    _playerPitch: PitchUnits,
  ): void {
    // 180 Flick targets are static and never expire; the player takes as long
    // as they need to complete the turn.
  }

  public onShot(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
    prng: PrngV1,
  ): void {
    const activeTargets = this.engine.getActiveTargets();
    const hitTarget = findHitTarget(playerYaw, playerPitch, activeTargets);

    if (hitTarget) {
      this.metricsTracker.recordShot(tick, hitTarget.id);
      const next = this.engine.onTargetHit(hitTarget.id, prng);
      if (next) this.metricsTracker.recordTargetSpawn(next.id, tick);
    } else {
      this.metricsTracker.recordShot(tick, null);
      const nearest = findNearestTarget(playerYaw, playerPitch, activeTargets);
      if (nearest) {
        const { direction } = classifyMiss(
          nearest.dx,
          nearest.dy,
          nearest.target.radiusAngleUnits,
        );
        this.missBreakdown[direction]++;
      }
    }
  }

  public getRenderTargets(): readonly TargetSpawnSpec[] {
    return this.engine.getActiveTargets();
  }

  public computeMetrics(elapsedTicks: number): GridMetrics {
    return this.metricsTracker.computeMetrics(elapsedTicks);
  }

  public computeScore(metrics: GridMetrics): Turn180ScoreResult {
    return computeTurn180DevScore(metrics);
  }
}

export function createTurn180ModeAdapter(): ModeRuntimeAdapter<GridMetrics> {
  return new Turn180ModeAdapter();
}
