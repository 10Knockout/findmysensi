import {
  findHitTarget,
  type AngleUnits,
  type PitchUnits,
  type PrngV1,
} from "@findmysensi/aim-core";
import {
  createFlickMetricsTracker,
  type FlickMetricsTracker,
  type GridMetrics,
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
import type { ModeRuntimeAdapter } from "./adapter.js";

class ReactionModeAdapter implements ModeRuntimeAdapter<GridMetrics> {
  public readonly modeId = "reaction";
  public readonly definition = REACTION_DEV_V0_DEFINITION;
  private readonly engine = new ReactionScenarioEngine(
    REACTION_DEV_V0_DEFINITION,
  );
  private metricsTracker: FlickMetricsTracker = createFlickMetricsTracker();
  private prng: PrngV1 | null = null;

  public initialize(prng: PrngV1): void {
    this.prng = prng;
    this.metricsTracker = createFlickMetricsTracker();
    this.engine.initialize(prng);
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
    const hit = findHitTarget(
      playerYaw,
      playerPitch,
      this.engine.getActiveTargets(),
    );
    this.metricsTracker.recordShot(tick, hit?.id ?? null);
    if (hit) this.engine.onTargetHit(hit.id, tick, prng);
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
