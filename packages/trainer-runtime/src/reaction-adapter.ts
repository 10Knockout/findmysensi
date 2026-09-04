import {
  findHitTarget,
  findNearestTarget,
  type AngleUnits,
  type PitchUnits,
  type PrngV1,
} from "@findmysensi/aim-core";
import {
  classifyMiss,
  createFlickMetricsTracker,
  type FlickMetricsTracker,
  type GridMetrics,
  type MissDirection,
} from "@findmysensi/analytics";
import type { Tick } from "@findmysensi/protocol";
import {
  REACTION_DEV_V0_DEFINITION,
  ReactionScenarioEngine,
  type TargetSpawnSpec,
} from "@findmysensi/scenarios";
import {
  computeReactionDevScore,
  type ReactionScoreResult,
} from "@findmysensi/scoring";
import type { MissBreakdownCapable, ModeRuntimeAdapter } from "./adapter.js";

function emptyMissBreakdown(): Record<MissDirection, number> {
  return { left: 0, right: 0, up: 0, down: 0, unclear: 0 };
}

class ReactionModeAdapter
  implements ModeRuntimeAdapter<GridMetrics>, MissBreakdownCapable
{
  public readonly modeId = "reaction";
  public readonly definition = REACTION_DEV_V0_DEFINITION;
  private readonly engine = new ReactionScenarioEngine(
    REACTION_DEV_V0_DEFINITION,
  );
  private metricsTracker: FlickMetricsTracker = createFlickMetricsTracker();
  private prng: PrngV1 | null = null;
  private missBreakdown: Record<MissDirection, number> = emptyMissBreakdown();

  public initialize(prng: PrngV1): void {
    this.prng = prng;
    this.metricsTracker = createFlickMetricsTracker();
    this.missBreakdown = emptyMissBreakdown();
    this.engine.initialize(prng);
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
    const event = this.engine.tick(tick, this.prng);
    if (event.expired) this.metricsTracker.recordExpiration(tick);
    if (event.spawned)
      this.metricsTracker.recordTargetSpawn(event.spawned.id, tick);
  }

  public onShot(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
    prng: PrngV1,
  ): void {
    const activeTargets = this.engine.getActiveTargets();
    const hit = findHitTarget(playerYaw, playerPitch, activeTargets);
    this.metricsTracker.recordShot(tick, hit?.id ?? null);
    if (hit) {
      this.engine.onTargetHit(hit.id, tick, prng);
      return;
    }
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

  public getRenderTargets(): readonly TargetSpawnSpec[] {
    return this.engine.getActiveTargets();
  }

  public computeMetrics(elapsedTicks: number): GridMetrics {
    return this.metricsTracker.computeMetrics(elapsedTicks);
  }

  public computeScore(metrics: GridMetrics): ReactionScoreResult {
    return computeReactionDevScore(metrics);
  }
}

export function createReactionModeAdapter(): ModeRuntimeAdapter<GridMetrics> {
  return new ReactionModeAdapter();
}
