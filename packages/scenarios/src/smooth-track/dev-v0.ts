import {
  FULL_TURN_UNITS,
  PrngV1,
  createAngleUnits,
  shortestSignedAngleDelta,
  wrapYaw,
} from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import { RankedScenarioDefinition, ScenarioEntry } from "../types.js";

/**
 * Sphere Track: one invincible target orbiting the player through the full
 * 360 degrees, horizontally and vertically. Keeping it in view can require a
 * complete turn, which is the point -- this is the only exercise that trains
 * tracking past the edge of the monitor.
 *
 * The 360 degree freedom comes from the spawn area: camera bounds are derived
 * from it, so a full-turn width lifts the yaw clamp entirely.
 *
 * Distance varies, and a fixed-size object further away subtends a smaller
 * angle, so the apparent radius shrinks and grows as the target drifts. That
 * is modelled directly in angular terms rather than by adding a Z axis the
 * renderer does not have.
 */

export interface SmoothTrackTarget {
  readonly id: number;
  readonly xAngleUnits: number;
  readonly yAngleUnits: number;
  readonly radiusAngleUnits: number;
  /** Distance in world units, kept for analytics bucketing. */
  readonly distanceUnits: number;
}

export interface SmoothTrackTickSample {
  readonly target: SmoothTrackTarget;
  readonly onTarget: boolean;
  readonly errorUnits: number;
}

/** Spec: the target roams between 7 and 15 units away. */
export const SPHERE_MIN_DISTANCE = 7;
export const SPHERE_MAX_DISTANCE = 15;
/**
 * Angular radius of the 0.40-unit target at each extreme: atan(0.4 / d).
 *   7 units  -> 3.27 deg radius
 *   15 units -> 1.53 deg radius
 */
export const SPHERE_MIN_RADIUS_UNITS = 71_190;
export const SPHERE_MAX_RADIUS_UNITS = 152_393;

/** Spec: 8-30 deg/sec horizontally, 5-20 deg/sec vertically. */
const SPHERE_MIN_YAW_SPEED = 2_913;
const SPHERE_MAX_YAW_SPEED = 10_923;
const SPHERE_MIN_PITCH_SPEED = 1_820;
const SPHERE_MAX_PITCH_SPEED = 7_282;

/** Spec: hold a chosen heading for 0.4-1.6 s, then pick a new one. */
export const SPHERE_MIN_HEADING_TICKS = 51;
export const SPHERE_MAX_HEADING_TICKS = 205;

/** How quickly actual velocity converges on the target velocity, per tick. */
const SPHERE_ACCELERATION = 0.06;

/** Vertical travel stays inside a comfortable band rather than gimbal-locking. */
const SPHERE_MAX_PITCH_UNITS = 1_400_000;

export const SMOOTH_TRACK_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "smooth-track",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: 1,
    // Nominal radius is the near-distance size; the live radius varies.
    targetRadiusAngleUnits: SPHERE_MAX_RADIUS_UNITS,
    // A full turn of spawn width is what unlocks unrestricted yaw.
    spawnAreaWidthUnits: FULL_TURN_UNITS,
    spawnAreaHeightUnits: SPHERE_MAX_PITCH_UNITS * 2,
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
    title: "Sphere Track",
    subtitle: "Full 360 Degree Tracking",
    description:
      "Maintain continuous tracking on a target moving around you in every direction, including behind you. No clicking -- time on target is the score.",
    category: "tracking",
    thumbnailUrl: "/thumbnails/smooth-track.webp",
    tags: ["sphere-track", "tracking", "360", "continuous", "practice"],
  },
};

defaultScenarioRegistry.register(SMOOTH_TRACK_DEV_V0_ENTRY);

export class SmoothTrackScenarioEngine {
  private x = 0;
  private y = 0;
  private distance = SPHERE_MIN_DISTANCE;
  private yawVelocity = 0;
  private pitchVelocity = 0;
  private targetYawVelocity = 0;
  private targetPitchVelocity = 0;
  private targetDistance = SPHERE_MIN_DISTANCE;
  private nextHeadingTick = 0;
  private onTargetTicks = 0;
  private totalTicks = 0;
  private errorSum = 0;
  private maxError = 0;

  public initialize(prng: PrngV1): SmoothTrackTarget {
    this.x = 0;
    this.y = 0;
    this.distance = SPHERE_MIN_DISTANCE;
    this.targetDistance = SPHERE_MIN_DISTANCE;
    this.yawVelocity = 0;
    this.pitchVelocity = 0;
    this.onTargetTicks = 0;
    this.totalTicks = 0;
    this.errorSum = 0;
    this.maxError = 0;
    this.chooseHeading(0, prng);
    return this.getTarget();
  }

  /**
   * Advances the orbit and measures crosshair error. Velocity eases towards
   * the chosen heading instead of snapping to it, so the path stays readable
   * rather than jittering unpredictably every frame.
   */
  public tick(
    currentTick: number,
    playerYaw: number,
    playerPitch: number,
    prng: PrngV1,
  ): SmoothTrackTickSample {
    if (currentTick >= this.nextHeadingTick) {
      this.chooseHeading(currentTick, prng);
    }

    this.yawVelocity +=
      (this.targetYawVelocity - this.yawVelocity) * SPHERE_ACCELERATION;
    this.pitchVelocity +=
      (this.targetPitchVelocity - this.pitchVelocity) * SPHERE_ACCELERATION;
    this.distance +=
      (this.targetDistance - this.distance) * SPHERE_ACCELERATION;

    this.x += this.yawVelocity;
    this.y += this.pitchVelocity;

    // Yaw wraps freely -- that is the whole point of the mode. Pitch reflects
    // so the target never climbs into the gimbal singularity.
    if (this.y > SPHERE_MAX_PITCH_UNITS) {
      this.y = SPHERE_MAX_PITCH_UNITS - (this.y - SPHERE_MAX_PITCH_UNITS);
      this.pitchVelocity = -this.pitchVelocity;
      this.targetPitchVelocity = -this.targetPitchVelocity;
    } else if (this.y < -SPHERE_MAX_PITCH_UNITS) {
      this.y = -SPHERE_MAX_PITCH_UNITS + (-SPHERE_MAX_PITCH_UNITS - this.y);
      this.pitchVelocity = -this.pitchVelocity;
      this.targetPitchVelocity = -this.targetPitchVelocity;
    }

    const target = this.getTarget();
    const dx = shortestSignedAngleDelta(
      createAngleUnits(target.xAngleUnits),
      wrapYaw(playerYaw),
    );
    const dy = playerPitch - target.yAngleUnits;
    const errorUnits = Math.sqrt(dx * dx + dy * dy);
    const onTarget = errorUnits <= target.radiusAngleUnits;

    this.totalTicks++;
    if (onTarget) this.onTargetTicks++;
    this.errorSum += errorUnits;
    if (errorUnits > this.maxError) this.maxError = errorUnits;

    return { target, onTarget, errorUnits };
  }

  public getTarget(): SmoothTrackTarget {
    return {
      id: 1,
      xAngleUnits: wrapYaw(Math.round(this.x)),
      yAngleUnits: Math.round(this.y),
      radiusAngleUnits: this.radiusForDistance(),
      distanceUnits: this.distance,
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

  /** A nearer target subtends a wider angle, so it looks bigger. */
  private radiusForDistance(): number {
    const span = SPHERE_MAX_DISTANCE - SPHERE_MIN_DISTANCE;
    const t = Math.min(
      1,
      Math.max(0, (this.distance - SPHERE_MIN_DISTANCE) / span),
    );
    return Math.round(
      SPHERE_MAX_RADIUS_UNITS -
        (SPHERE_MAX_RADIUS_UNITS - SPHERE_MIN_RADIUS_UNITS) * t,
    );
  }

  private chooseHeading(currentTick: number, prng: PrngV1): void {
    const yawSpeed = prng.nextRange(SPHERE_MIN_YAW_SPEED, SPHERE_MAX_YAW_SPEED);
    const pitchSpeed = prng.nextRange(
      SPHERE_MIN_PITCH_SPEED,
      SPHERE_MAX_PITCH_SPEED,
    );
    this.targetYawVelocity = prng.nextRange(0, 2) === 0 ? -yawSpeed : yawSpeed;
    this.targetPitchVelocity =
      prng.nextRange(0, 2) === 0 ? -pitchSpeed : pitchSpeed;
    this.targetDistance = prng.nextRange(
      SPHERE_MIN_DISTANCE,
      SPHERE_MAX_DISTANCE + 1,
    );
    this.nextHeadingTick =
      currentTick +
      prng.nextRange(SPHERE_MIN_HEADING_TICKS, SPHERE_MAX_HEADING_TICKS + 1);
  }
}
