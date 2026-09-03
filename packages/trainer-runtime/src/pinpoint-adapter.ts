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
  PINPOINT_DEV_V0_DEFINITION,
  PinpointScenarioEngine,
  TargetSpawnSpec,
} from "@findmysensi/scenarios";
import { computePinpointDevScore, ScoreResult } from "@findmysensi/scoring";
import { ModeRuntimeAdapter } from "./adapter.js";

class PinpointModeAdapter implements ModeRuntimeAdapter<GridMetrics> {
  public readonly modeId = "pinpoint";
  public readonly definition = PINPOINT_DEV_V0_DEFINITION;

  private readonly engine = new PinpointScenarioEngine(
    PINPOINT_DEV_V0_DEFINITION,
  );
  private metricsTracker: FlickMetricsTracker = createFlickMetricsTracker();
  private prng: PrngV1 | null = null;

  public initialize(prng: PrngV1): void {
    this.prng = prng;
    this.metricsTracker = createFlickMetricsTracker();
    const initialTargets = this.engine.initialize(prng, 0);
    for (const target of initialTargets) {
      this.metricsTracker.recordTargetSpawn(target.id, 0);
    }
  }

  public onSimulationTick(
    tick: Tick,
    _playerYaw: AngleUnits,
    _playerPitch: PitchUnits,
  ): void {
    if (!this.prng) return;

    const { expired, spawned } = this.engine.tick(tick, this.prng);
    for (const _target of expired) {
      this.metricsTracker.recordExpiration(tick);
    }
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
      const newTarget = this.engine.onTargetHit(hitTarget.id, prng, tick);
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
    return computePinpointDevScore(metrics);
  }
}

export function createPinpointModeAdapter(): ModeRuntimeAdapter<GridMetrics> {
  return new PinpointModeAdapter();
}
