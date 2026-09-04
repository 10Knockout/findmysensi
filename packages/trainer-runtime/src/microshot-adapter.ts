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
  MICROSHOT_DEV_V0_DEFINITION,
  MicroshotScenarioEngine,
  type TargetSpawnSpec,
} from "@findmysensi/scenarios";
import {
  computeMicroshotDevScore,
  type MicroshotScoreResult,
} from "@findmysensi/scoring";
import type { ModeRuntimeAdapter } from "./adapter.js";

class MicroshotModeAdapter implements ModeRuntimeAdapter<GridMetrics> {
  public readonly modeId = "microshot";
  public readonly definition = MICROSHOT_DEV_V0_DEFINITION;
  private readonly engine = new MicroshotScenarioEngine(
    MICROSHOT_DEV_V0_DEFINITION,
  );
  private metricsTracker: FlickMetricsTracker = createFlickMetricsTracker();

  public initialize(prng: PrngV1): void {
    this.metricsTracker = createFlickMetricsTracker();
    const target = this.engine.initialize(prng);
    this.metricsTracker.recordTargetSpawn(target.id, 0);
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
    const hit = findHitTarget(
      playerYaw,
      playerPitch,
      this.engine.getActiveTargets(),
    );
    this.metricsTracker.recordShot(tick, hit?.id ?? null);
    if (!hit) return;
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
