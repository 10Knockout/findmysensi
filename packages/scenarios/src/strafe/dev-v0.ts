import {
  PrngV1,
  createAngleUnits,
  shortestSignedAngleDelta,
  wrapYaw,
} from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import { RankedScenarioDefinition, ScenarioEntry } from "../types.js";

/**
 * Strafe Track: one invincible target sliding left and right, reversing at
 * unpredictable intervals. The player never clicks -- the score is simply how
 * much of the run they kept the crosshair on the target.
 *
 * Clicking is deliberately absent. The thing being measured is mouse control,
 * and requiring a held button would fold "did you remember to hold fire" into
 * a number that is supposed to be about tracking alone.
 */

export interface StrafeTarget {
  readonly id: number;
  readonly xAngleUnits: number;
  readonly yAngleUnits: number;
  readonly radiusAngleUnits: number;
  /** Signed angle units per tick; negative is leftward. */
  readonly velocityUnitsPerTick: number;
}

export interface StrafeTickSample {
  readonly target: StrafeTarget;
  readonly onTarget: boolean;
  readonly errorUnits: number;
  /** True on the tick the target changed direction. */
  readonly reversed: boolean;
}

/** Spec: 3.0 deg diameter, so a 1.5 deg radius. */
export const STRAFE_RADIUS_UNITS = 69_905;
/** Spec: the target patrols -38..+38 deg. */
export const STRAFE_HALF_WIDTH_UNITS = 1_770_929;
/** Spec: 20 deg/sec at the 128 Hz simulation rate. */
export const STRAFE_SPEED_UNITS_PER_TICK = 7_282;
/** Spec: direction flips somewhere between 0.65 s and 1.8 s. */
export const STRAFE_MIN_REVERSAL_TICKS = 83;
export const STRAFE_MAX_REVERSAL_TICKS = 230;

export const STRAFE_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "strafe",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: 1,
    targetRadiusAngleUnits: STRAFE_RADIUS_UNITS,
    spawnAreaWidthUnits: STRAFE_HALF_WIDTH_UNITS * 2,
    spawnAreaHeightUnits: 0,
    minTargetSeparationUnits: 0,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const STRAFE_DEV_V0_ENTRY: ScenarioEntry = {
  definition: STRAFE_DEV_V0_DEFINITION,
  presentation: {
    title: "Strafe Track",
    subtitle: "Reactive Horizontal Tracking",
    description:
      "Keep your crosshair attached to a target as it strafes left and right. React smoothly to unpredictable direction changes. No clicking -- time on target is the score.",
    category: "tracking",
    thumbnailUrl: "/thumbnails/strafe.webp",
    tags: ["strafe", "tracking", "reversal", "moving", "practice"],
  },
};

defaultScenarioRegistry.register(STRAFE_DEV_V0_ENTRY);

export class StrafeScenarioEngine {
  private readonly radiusUnits: number;
  private readonly halfWidth: number;
  private readonly speed: number;
  private x = 0;
  private velocity = 0;
  private nextReversalTick = 0;
  private onTargetTicks = 0;
  private totalTicks = 0;
  private errorSum = 0;
  private maxError = 0;

  constructor(definition: RankedScenarioDefinition = STRAFE_DEV_V0_DEFINITION) {
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.halfWidth = Math.floor(definition.simulation.spawnAreaWidthUnits / 2);
    this.speed = STRAFE_SPEED_UNITS_PER_TICK;
  }

  public initialize(prng: PrngV1): StrafeTarget {
    this.x = 0;
    this.velocity = prng.nextRange(0, 2) === 0 ? -this.speed : this.speed;
    this.onTargetTicks = 0;
    this.totalTicks = 0;
    this.errorSum = 0;
    this.maxError = 0;
    this.scheduleReversal(0, prng);
    return this.getTarget();
  }

  /**
   * Moves the target one tick and measures how far the crosshair sits from
   * its centre. Movement stays continuous: reversals flip the velocity, they
   * never teleport the target.
   */
  public tick(
    currentTick: number,
    playerYaw: number,
    playerPitch: number,
    prng: PrngV1,
  ): StrafeTickSample {
    let reversed = false;

    if (currentTick >= this.nextReversalTick) {
      this.velocity = -this.velocity;
      this.scheduleReversal(currentTick, prng);
      reversed = true;
    }

    this.x += this.velocity;
    if (this.x > this.halfWidth) {
      this.x = this.halfWidth - (this.x - this.halfWidth);
      this.velocity = -this.velocity;
      reversed = true;
    } else if (this.x < -this.halfWidth) {
      this.x = -this.halfWidth + (-this.halfWidth - this.x);
      this.velocity = -this.velocity;
      reversed = true;
    }

    const target = this.getTarget();
    const dx = shortestSignedAngleDelta(
      createAngleUnits(target.xAngleUnits),
      wrapYaw(playerYaw),
    );
    const dy = playerPitch - target.yAngleUnits;
    const errorUnits = Math.sqrt(dx * dx + dy * dy);
    const onTarget = errorUnits <= this.radiusUnits;

    this.totalTicks++;
    if (onTarget) this.onTargetTicks++;
    this.errorSum += errorUnits;
    if (errorUnits > this.maxError) this.maxError = errorUnits;

    return { target, onTarget, errorUnits, reversed };
  }

  public getTarget(): StrafeTarget {
    return {
      id: 1,
      xAngleUnits: wrapYaw(this.x),
      yAngleUnits: 0,
      radiusAngleUnits: this.radiusUnits,
      velocityUnitsPerTick: this.velocity,
    };
  }

  public getTrackingMetrics(): {
    onTargetTicks: number;
    totalTicks: number;
    onTargetPercentage: number;
    averageErrorUnits: number;
    maxErrorUnits: number;
  } {
    return {
      onTargetTicks: this.onTargetTicks,
      totalTicks: this.totalTicks,
      onTargetPercentage:
        this.totalTicks > 0
          ? Math.round((this.onTargetTicks / this.totalTicks) * 10000) / 100
          : 0,
      averageErrorUnits:
        this.totalTicks > 0 ? Math.round(this.errorSum / this.totalTicks) : 0,
      maxErrorUnits: Math.round(this.maxError),
    };
  }

  private scheduleReversal(currentTick: number, prng: PrngV1): void {
    this.nextReversalTick =
      currentTick +
      prng.nextRange(STRAFE_MIN_REVERSAL_TICKS, STRAFE_MAX_REVERSAL_TICKS + 1);
  }
}
