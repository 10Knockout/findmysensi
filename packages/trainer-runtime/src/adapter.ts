import type { AngleUnits, PitchUnits, PrngV1 } from "@findmysensi/aim-core";
import type { GridMetrics } from "@findmysensi/analytics";
import type { Tick } from "@findmysensi/protocol";
import type {
  RankedScenarioDefinition,
  TargetSpawnSpec,
} from "@findmysensi/scenarios";
import type { ScoreResult } from "@findmysensi/scoring";

/**
 * The metrics shape Grid, Pinpoint, Multi, Headline, and Strafe all share
 * (hits/shots/misses/accuracy/acquisition/KPS). Smooth Track and Tempo use
 * different shapes entirely and are not covered by this milestone.
 */
export type ClickMetrics = GridMetrics;

export interface ModeRuntimeAdapter<
  TMetrics extends ClickMetrics = ClickMetrics,
> {
  readonly modeId: string;
  readonly definition: RankedScenarioDefinition;

  initialize(prng: PrngV1): void;

  onSimulationTick(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
  ): void;

  onShot(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
    prng: PrngV1,
  ): void;

  getRenderTargets(): readonly TargetSpawnSpec[];

  computeMetrics(elapsedTicks: number): TMetrics;

  computeScore(metrics: TMetrics): ScoreResult;
}
