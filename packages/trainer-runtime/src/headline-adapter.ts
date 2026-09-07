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
  HEADLINE_DEV_V0_DEFINITION,
  HeadlineScenarioEngine,
  TargetSpawnSpec,
} from "@findmysensi/scenarios";
import { computeHeadlineDevScore, ScoreResult } from "@findmysensi/scoring";
import { MissBreakdownCapable, ModeRuntimeAdapter } from "./adapter.js";

function emptyMissBreakdown(): Record<MissDirection, number> {
  return { left: 0, right: 0, up: 0, down: 0, unclear: 0 };
}

class HeadlineModeAdapter
  implements ModeRuntimeAdapter<GridMetrics>, MissBreakdownCapable
{
  public readonly modeId = "headline";
  public readonly definition = HEADLINE_DEV_V0_DEFINITION;

  private readonly engine = new HeadlineScenarioEngine(
    HEADLINE_DEV_V0_DEFINITION,
  );
  private metricsTracker: FlickMetricsTracker = createFlickMetricsTracker();
  private missBreakdown: Record<MissDirection, number> = emptyMissBreakdown();
  private prng: PrngV1 | null = null;

  public initialize(prng: PrngV1): void {
    this.metricsTracker = createFlickMetricsTracker();
    this.missBreakdown = emptyMissBreakdown();
    this.prng = prng;
    const initialTargets = this.engine.initialize(prng);
    for (const target of initialTargets) {
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
    if (!this.prng) return;

    // Headshot Lane targets strafe continuously and killed ones return on a
    // short delay, so the lane advances every tick.
    const { spawned } = this.engine.tick(tick, this.prng);
    for (const target of spawned) {
      this.metricsTracker.recordTargetSpawn(target.id, tick);
    }
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
      // The replacement is queued, not immediate; onSimulationTick records it
      // when the respawn delay elapses.
      this.engine.onTargetHit(hitTarget.id, tick, prng);
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
    return computeHeadlineDevScore(metrics);
  }
}

export function createHeadlineModeAdapter(): ModeRuntimeAdapter<GridMetrics> {
  return new HeadlineModeAdapter();
}
