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
  MOTION_FLICK_DEV_V0_DEFINITION,
  MotionFlickScenarioEngine,
  TargetSpawnSpec,
} from "@findmysensi/scenarios";
import {
  computeMotionFlickDevScore,
  MotionFlickScoreResult,
} from "@findmysensi/scoring";
import { MissBreakdownCapable, ModeRuntimeAdapter } from "./adapter.js";

function emptyMissBreakdown(): Record<MissDirection, number> {
  return { left: 0, right: 0, up: 0, down: 0, unclear: 0 };
}

class MotionFlickModeAdapter
  implements ModeRuntimeAdapter<GridMetrics>, MissBreakdownCapable
{
  public readonly modeId = "motion-flick";
  public readonly definition = MOTION_FLICK_DEV_V0_DEFINITION;

  private readonly engine = new MotionFlickScenarioEngine(
    MOTION_FLICK_DEV_V0_DEFINITION,
  );
  private metricsTracker: FlickMetricsTracker = createFlickMetricsTracker();
  private missBreakdown: Record<MissDirection, number> = emptyMissBreakdown();
  private prng: PrngV1 | null = null;

  public initialize(prng: PrngV1): void {
    this.metricsTracker = createFlickMetricsTracker();
    this.missBreakdown = emptyMissBreakdown();
    this.prng = prng;
    const target = this.engine.initialize(prng);
    this.metricsTracker.recordTargetSpawn(target.id, 0);
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

    // The moving target drifts every tick and escapes if it is never
    // intercepted, which counts as a miss.
    const { expired, spawned } = this.engine.tick(tick, this.prng);
    if (expired) this.metricsTracker.recordExpiration(tick);
    if (spawned) this.metricsTracker.recordTargetSpawn(spawned.id, tick);
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
      const next = this.engine.onTargetHit(hitTarget.id, tick, prng);
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

  public computeScore(metrics: GridMetrics): MotionFlickScoreResult {
    return computeMotionFlickDevScore(metrics);
  }
}

export function createMotionFlickModeAdapter(): ModeRuntimeAdapter<GridMetrics> {
  return new MotionFlickModeAdapter();
}
