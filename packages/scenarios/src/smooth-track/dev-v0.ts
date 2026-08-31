import { PrngV1 } from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import { RankedScenarioDefinition, ScenarioEntry } from "../types.js";

/**
 * Smooth Track: Deterministic continuous path tracking.
 * A single target follows a smooth Lissajous-like path. Player must keep
 * their crosshair on the target continuously. Scoring is based on
 * on-target time and angular error distance.
 *
 * This is NOT a click scenario — it's a beam/tracking scenario.
 */

export interface SmoothTrackTarget {
  readonly id: number;
  readonly xAngleUnits: number;
  readonly yAngleUnits: number;
  readonly radiusAngleUnits: number;
}

/** Path parameters for the Lissajous figure */
export interface SmoothTrackPathParams {
  readonly amplitudeX: number; // angle-units
  readonly amplitudeY: number; // angle-units
  readonly frequencyX: number; // cycles per full duration
  readonly frequencyY: number; // cycles per full duration
  readonly phaseOffsetY: number; // radians — phase difference between X and Y
}

export const SMOOTH_TRACK_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "smooth-track",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: 1,
    targetRadiusAngleUnits: 35000, // ~0.75 deg — generous for tracking
    spawnAreaWidthUnits: 1200000,
    spawnAreaHeightUnits: 700000,
    minTargetSeparationUnits: 0,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const SMOOTH_TRACK_DEV_V0_ENTRY: ScenarioEntry = {
  definition: SMOOTH_TRACK_DEV_V0_DEFINITION,
  presentation: {
    title: "Smooth Track (Dev v0)",
    subtitle: "Continuous Path Tracking",
    description:
      "Track a target moving along a smooth Lissajous path. Scored by on-target time and angular error.",
    category: "tracking",
    thumbnailUrl: "/thumbnails/smooth-track.webp",
    tags: ["smooth-track", "tracking", "continuous", "beam", "practice"],
  },
};

defaultScenarioRegistry.register(SMOOTH_TRACK_DEV_V0_ENTRY);

const DEFAULT_PATH_PARAMS: SmoothTrackPathParams = {
  amplitudeX: 500000, // ~10.7 deg
  amplitudeY: 300000, // ~6.4 deg
  frequencyX: 3, // 3 full cycles in 60 seconds
  frequencyY: 2, // 2 full cycles in 60 seconds
  phaseOffsetY: Math.PI / 4, // 45 deg phase offset creates figure-8-like path
};

export class SmoothTrackScenarioEngine {
  private readonly durationTicks: number;
  private readonly radiusUnits: number;
  private readonly pathParams: SmoothTrackPathParams;
  private target: SmoothTrackTarget;
  /** Samples of angular error for scoring */
  private errorSamples: number[] = [];
  private onTargetTicks: number = 0;
  private totalTicks: number = 0;

  constructor(
    definition: RankedScenarioDefinition = SMOOTH_TRACK_DEV_V0_DEFINITION,
    pathParams: SmoothTrackPathParams = DEFAULT_PATH_PARAMS,
  ) {
    this.durationTicks = definition.durationTicks;
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.pathParams = pathParams;
    this.target = {
      id: 1,
      xAngleUnits: 0,
      yAngleUnits: 0,
      radiusAngleUnits: this.radiusUnits,
    };
  }

  /**
   * Seed is used for minor path jitter (optional future use).
   * Currently the path is fully deterministic from params.
   */
  public initialize(_prng: PrngV1): SmoothTrackTarget {
    this.errorSamples = [];
    this.onTargetTicks = 0;
    this.totalTicks = 0;
    this.target = this.computePosition(0);
    return this.target;
  }

  /**
   * Compute the target position at a given tick using Lissajous parametric equations.
   */
  public computePosition(tick: number): SmoothTrackTarget {
    const t = (tick / this.durationTicks) * 2 * Math.PI;
    const p = this.pathParams;

    const x = Math.round(p.amplitudeX * Math.sin(p.frequencyX * t));
    const y = Math.round(
      p.amplitudeY * Math.sin(p.frequencyY * t + p.phaseOffsetY),
    );

    this.target = {
      id: 1,
      xAngleUnits: x,
      yAngleUnits: y,
      radiusAngleUnits: this.radiusUnits,
    };

    return this.target;
  }

  /**
   * Called each tick with the player's current crosshair position.
   * Records whether the player is on-target and the angular error.
   */
  public tick(
    currentTick: number,
    playerYaw: number,
    playerPitch: number,
  ): { target: SmoothTrackTarget; onTarget: boolean; errorUnits: number } {
    this.computePosition(currentTick);
    this.totalTicks++;

    const dx = playerYaw - this.target.xAngleUnits;
    const dy = playerPitch - this.target.yAngleUnits;
    const errorUnits = Math.sqrt(dx * dx + dy * dy);
    const onTarget = errorUnits <= this.radiusUnits;

    if (onTarget) this.onTargetTicks++;
    this.errorSamples.push(errorUnits);

    return { target: this.target, onTarget, errorUnits };
  }

  public getTarget(): SmoothTrackTarget {
    return this.target;
  }

  public getTrackingMetrics(): {
    onTargetPercentage: number;
    averageErrorUnits: number;
    totalTicks: number;
    onTargetTicks: number;
  } {
    const avgError =
      this.errorSamples.length > 0
        ? this.errorSamples.reduce((a, b) => a + b, 0) /
          this.errorSamples.length
        : 0;

    return {
      onTargetPercentage:
        this.totalTicks > 0
          ? Math.round((this.onTargetTicks / this.totalTicks) * 10000) / 100
          : 0,
      averageErrorUnits: Math.round(avgError),
      totalTicks: this.totalTicks,
      onTargetTicks: this.onTargetTicks,
    };
  }
}
