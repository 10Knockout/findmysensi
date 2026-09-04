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
  HEADLINE_DEV_V0_DEFINITION,
  HeadlineScenarioEngine,
  TargetSpawnSpec,
} from "@findmysensi/scenarios";
import { computeHeadlineDevScore, ScoreResult } from "@findmysensi/scoring";
import { ModeRuntimeAdapter } from "./adapter.js";

class HeadlineModeAdapter implements ModeRuntimeAdapter<GridMetrics> {
  public readonly modeId = "headline";
  public readonly definition = HEADLINE_DEV_V0_DEFINITION;

  private readonly engine = new HeadlineScenarioEngine(
    HEADLINE_DEV_V0_DEFINITION,
  );
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
    // Headline is click-discrete; nothing changes without a shot.
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
      this.engine.getActiveTargets(),
    );

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
    return computeHeadlineDevScore(metrics);
  }
}

export function createHeadlineModeAdapter(): ModeRuntimeAdapter<GridMetrics> {
  return new HeadlineModeAdapter();
}
