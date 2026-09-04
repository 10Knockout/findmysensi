import type { AngleUnits, PitchUnits, PrngV1 } from "@findmysensi/aim-core";
import type {
  GridMetrics,
  SwitchTrackMetrics,
  TempoMetrics,
  TrackingMetrics,
} from "@findmysensi/analytics";
import type { Tick } from "@findmysensi/protocol";
import type {
  RankedScenarioDefinition,
  TargetSpawnSpec,
} from "@findmysensi/scenarios";

export type ClickMetrics = GridMetrics;
export type RuntimeMetrics =
  ClickMetrics | TrackingMetrics | TempoMetrics | SwitchTrackMetrics;

export interface RuntimeScoreResult<
  TMetrics extends RuntimeMetrics = RuntimeMetrics,
> {
  readonly score: number;
  readonly metrics: TMetrics;
}

export interface ModeRuntimeAdapter<
  TMetrics extends RuntimeMetrics = RuntimeMetrics,
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

  computeScore(metrics: TMetrics): RuntimeScoreResult<TMetrics>;
}
