import {
  AngleUnits,
  findHitTarget,
  findNearestTarget,
  PitchUnits,
  PrngV1,
} from "@findmysensi/aim-core";
import {
  classifyMiss,
  createGridMetricsTracker,
  GridMetrics,
  GridMetricsTracker,
  MissDirection,
} from "@findmysensi/analytics";
import { Tick } from "@findmysensi/protocol";
import {
  GRID_DEV_V0_DEFINITION,
  GridScenarioEngine,
  TargetSpawnSpec,
} from "@findmysensi/scenarios";
import { computeGridDevScore, ScoreResult } from "@findmysensi/scoring";
import { MissBreakdownCapable, ModeRuntimeAdapter } from "./adapter.js";

function emptyMissBreakdown(): Record<MissDirection, number> {
  return { left: 0, right: 0, up: 0, down: 0, unclear: 0 };
}

class GridModeAdapter
  implements ModeRuntimeAdapter<GridMetrics>, MissBreakdownCapable
{
  public readonly modeId = "grid";
  public readonly definition = GRID_DEV_V0_DEFINITION;

  private readonly engine = new GridScenarioEngine(GRID_DEV_V0_DEFINITION);
  private metricsTracker: GridMetricsTracker = createGridMetricsTracker();
  private missBreakdown: Record<MissDirection, number> = emptyMissBreakdown();

  public initialize(prng: PrngV1): void {
    this.metricsTracker = createGridMetricsTracker();
    this.missBreakdown = emptyMissBreakdown();
    const initialTargets = this.engine.initialize(prng);
    for (const target of initialTargets) {
      this.metricsTracker.recordTargetSpawn(target.id, 0);
    }
  }

  public getMissBreakdown(): Readonly<Record<MissDirection, number>> {
    return this.missBreakdown;
  }

  public onSimulationTick(
    _tick: Tick,
    _playerYaw: AngleUnits,
    _playerPitch: PitchUnits,
  ): void {
    // Grid is click-discrete; nothing happens on ticks without a shot.
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
      const newTarget = this.engine.onTargetHit(hitTarget.id, prng);
      if (newTarget) {
        this.metricsTracker.recordTargetSpawn(newTarget.id, tick);
      }
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

  public computeScore(metrics: GridMetrics): ScoreResult {
    return computeGridDevScore(metrics);
  }
}

export function createGridModeAdapter(): ModeRuntimeAdapter<GridMetrics> {
  return new GridModeAdapter();
}
