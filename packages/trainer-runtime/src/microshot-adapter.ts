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
  MICROSHOT_DEV_V0_DEFINITION,
  MicroshotScenarioEngine,
  type TargetSpawnSpec,
} from "@findmysensi/scenarios";
import {
  computeMicroshotDevScore,
  type MicroshotScoreResult,
} from "@findmysensi/scoring";
import type { MissBreakdownCapable, ModeRuntimeAdapter } from "./adapter.js";

function emptyMissBreakdown(): Record<MissDirection, number> {
  return { left: 0, right: 0, up: 0, down: 0, unclear: 0 };
}

class MicroshotModeAdapter
  implements ModeRuntimeAdapter<GridMetrics>, MissBreakdownCapable
{
  public readonly modeId = "microshot";
  public readonly definition = MICROSHOT_DEV_V0_DEFINITION;
  private readonly engine = new MicroshotScenarioEngine(
    MICROSHOT_DEV_V0_DEFINITION,
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
  ): void {}

  public onShot(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
    prng: PrngV1,
  ): void {
    const activeTargets = this.engine.getActiveTargets();
    const hit = findHitTarget(playerYaw, playerPitch, activeTargets);
    this.metricsTracker.recordShot(tick, hit?.id ?? null);
    if (!hit) {
      const nearest = findNearestTarget(playerYaw, playerPitch, activeTargets);
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
    const next = this.engine.onTargetHit(hit.id, playerYaw, playerPitch, prng);
    if (next) this.metricsTracker.recordTargetSpawn(next.id, tick);
  }

  public getRenderTargets(): readonly TargetSpawnSpec[] {
    return this.engine.getActiveTargets();
  }

  public computeMetrics(elapsedTicks: number): GridMetrics {
    return this.metricsTracker.computeMetrics(elapsedTicks);
  }

  public computeScore(metrics: GridMetrics): MicroshotScoreResult {
    return computeMicroshotDevScore(metrics);
  }
}

export function createMicroshotModeAdapter(): ModeRuntimeAdapter<GridMetrics> {
  return new MicroshotModeAdapter();
}
