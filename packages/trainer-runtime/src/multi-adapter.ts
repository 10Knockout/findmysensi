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
  MULTI_DEV_V0_DEFINITION,
  MultiScenarioEngine,
  TargetSpawnSpec,
} from "@findmysensi/scenarios";
import { computeMultiDevScore, ScoreResult } from "@findmysensi/scoring";
import { ModeRuntimeAdapter } from "./adapter.js";

class MultiModeAdapter implements ModeRuntimeAdapter<GridMetrics> {
  public readonly modeId = "multi";
  public readonly definition = MULTI_DEV_V0_DEFINITION;

  private readonly engine = new MultiScenarioEngine(MULTI_DEV_V0_DEFINITION);
  private metricsTracker: FlickMetricsTracker = createFlickMetricsTracker();

  public initialize(prng: PrngV1): void {
    this.metricsTracker = createFlickMetricsTracker();
    const initialTargets = this.engine.initialize(prng);
    for (const target of initialTargets) {
      this.metricsTracker.recordTargetSpawn(target.id, 0);
    }
  }

  public onSimulationTick(
    _tick: Tick,
    _playerYaw: AngleUnits,
    _playerPitch: PitchUnits,
  ): void {
    // Multi is click-discrete with no target lifetime; nothing happens on
    // ticks without a shot.
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
    }
  }

  public getRenderTargets(): readonly TargetSpawnSpec[] {
    return this.engine.getActiveTargets();
  }

  public computeMetrics(elapsedTicks: number): GridMetrics {
    return this.metricsTracker.computeMetrics(elapsedTicks);
  }

  public computeScore(metrics: GridMetrics): ScoreResult {
    return computeMultiDevScore(metrics);
  }
}

export function createMultiModeAdapter(): ModeRuntimeAdapter<GridMetrics> {
  return new MultiModeAdapter();
}
