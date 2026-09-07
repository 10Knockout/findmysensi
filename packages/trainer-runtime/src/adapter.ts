import type { AngleUnits, PitchUnits, PrngV1 } from "@findmysensi/aim-core";
import type {
  GridMetrics,
  MissDirection,
  SwitchTrackMetrics,
  TrackingMetrics,
} from "@findmysensi/analytics";
import type { Tick } from "@findmysensi/protocol";
import type {
  RankedScenarioDefinition,
  TargetSpawnSpec,
} from "@findmysensi/scenarios";

export type ClickMetrics = GridMetrics;
export type RuntimeMetrics =
  ClickMetrics | TrackingMetrics | SwitchTrackMetrics;

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

/**
 * Optional capability: adapters for click-discrete modes with a meaningful
 * spatial miss (a shot fired at open space, near a real target) can
 * implement this to expose a "why did I miss" breakdown. Not part of
 * ModeRuntimeAdapter itself -- modes without a spatial miss concept (Smooth
 * Track's continuous tracking) never implement it.
 * Callers feature-detect with `"getMissBreakdown" in adapter`.
 */
export interface MissBreakdownCapable {
  getMissBreakdown(): Readonly<Record<MissDirection, number>>;
}
