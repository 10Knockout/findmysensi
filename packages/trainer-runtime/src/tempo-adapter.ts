import {
  findHitTarget,
  type AngleUnits,
  type PitchUnits,
  type PrngV1,
} from "@findmysensi/aim-core";
import {
  createTempoMetricsTracker,
  type TempoMetrics,
  type TempoMetricsTracker,
} from "@findmysensi/analytics";
import type { Tick } from "@findmysensi/protocol";
import {
  TEMPO_DEV_V0_DEFINITION,
  TempoScenarioEngine,
  type TargetSpawnSpec,
  type TempoJudgement,
} from "@findmysensi/scenarios";
import {
  computeTempoDevScore,
  type TempoScoreResult,
} from "@findmysensi/scoring";
import type { ModeRuntimeAdapter } from "./adapter.js";

class TempoModeAdapter implements ModeRuntimeAdapter<TempoMetrics> {
  public readonly modeId = "tempo";
  public readonly definition = TEMPO_DEV_V0_DEFINITION;
  private readonly engine = new TempoScenarioEngine(TEMPO_DEV_V0_DEFINITION);
  private metricsTracker: TempoMetricsTracker = createTempoMetricsTracker();
  private processedEngineJudgements = 0;
  private perfectStreak = 0;
  private maxPerfectStreak = 0;

  public initialize(prng: PrngV1): void {
    this.metricsTracker = createTempoMetricsTracker();
    this.processedEngineJudgements = 0;
    this.perfectStreak = 0;
    this.maxPerfectStreak = 0;
    this.engine.initialize(prng);
  }

  public onSimulationTick(
    tick: Tick,
    _playerYaw: AngleUnits,
    _playerPitch: PitchUnits,
  ): void {
    this.engine.tick(tick);
    this.syncEngineJudgements();
  }

  public onShot(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
    _prng: PrngV1,
  ): void {
    const active = this.engine.getActiveTarget();
    const hit = active ? findHitTarget(playerYaw, playerPitch, [active]) : null;
    const judgement = this.engine.processShot(tick, hit?.id ?? null);
    const engineJudgements = this.engine.getJudgements();

    if (engineJudgements.length > this.processedEngineJudgements) {
      this.syncEngineJudgements();
    } else {
      this.recordJudgement(judgement);
    }
  }

  public getRenderTargets(): readonly TargetSpawnSpec[] {
    const target = this.engine.getActiveTarget();
    return target ? [target] : [];
  }

  public computeMetrics(_elapsedTicks: number): TempoMetrics {
    return this.metricsTracker.computeMetrics();
  }

  public computeScore(metrics: TempoMetrics): TempoScoreResult {
    return computeTempoDevScore(metrics, this.maxPerfectStreak);
  }

  private syncEngineJudgements(): void {
    const judgements = this.engine.getJudgements();
    for (
      let index = this.processedEngineJudgements;
      index < judgements.length;
      index++
    ) {
      this.recordJudgement(judgements[index]!);
    }
    this.processedEngineJudgements = judgements.length;
  }

  private recordJudgement(judgement: TempoJudgement): void {
    this.metricsTracker.recordJudgement(judgement);
    if (judgement === "perfect") {
      this.perfectStreak++;
      this.maxPerfectStreak = Math.max(
        this.maxPerfectStreak,
        this.perfectStreak,
      );
    } else {
      this.perfectStreak = 0;
    }
  }
}

export function createTempoModeAdapter(): ModeRuntimeAdapter<TempoMetrics> {
  return new TempoModeAdapter();
}
