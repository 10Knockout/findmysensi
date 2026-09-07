import { PrngV1, wrapYaw } from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

/**
 * Headshot Lane: four head-height targets strafing horizontally at three
 * different distances. Nearer targets look bigger and cross the view faster;
 * far ones are small and slow. One click kills.
 *
 * Depth is expressed purely as angular size and angular speed. The renderer
 * has no Z axis, and inventing one to imitate a 3D room would add a whole
 * projection pipeline for no gameplay gain -- a target 18 units away simply
 * *is* a 1.02 deg circle drifting slowly.
 */

export type HeadlineDepth = "near" | "medium" | "far";

export interface HeadlineTarget extends TargetSpawnSpec {
  readonly depth: HeadlineDepth;
  /** Signed angle units per tick; negative is leftward. */
  readonly velocityUnitsPerTick: number;
}

/**
 * Angular radius for a 0.16-unit target at each spec distance:
 * atan(0.16 / d), doubled for diameter.
 *   near   8 units -> 2.29 deg across
 *   medium 12      -> 1.53 deg
 *   far    18      -> 1.02 deg
 */
export const HEADLINE_DEPTH_RADIUS_UNITS: Record<HeadlineDepth, number> = {
  near: 53_410,
  medium: 35_605,
  far: 23_737,
};

/** Angular speed bands, in units/tick: nearer targets sweep faster. */
const HEADLINE_DEPTH_SPEED_UNITS_PER_TICK: Record<
  HeadlineDepth,
  readonly [number, number]
> = {
  near: [4_733, 5_825],
  medium: [3_641, 4_733],
  far: [2_913, 3_641],
};

const HEADLINE_DEPTHS: readonly HeadlineDepth[] = ["near", "medium", "far"];

/** Spec: targets reflect at +/-42 deg. */
export const HEADLINE_HALF_WIDTH_UNITS = 1_957_342;
/** Spec: head-height band runs -3 deg to +5 deg. */
export const HEADLINE_MIN_PITCH_UNITS = -139_810;
export const HEADLINE_MAX_PITCH_UNITS = 233_017;
/** Spec: a killed target is replaced after 100-250 ms. */
export const HEADLINE_MIN_RESPAWN_TICKS = 13;
export const HEADLINE_MAX_RESPAWN_TICKS = 32;

export const HEADLINE_ACTIVE_TARGETS = 4;

export interface HeadlineTickResult {
  readonly spawned: readonly HeadlineTarget[];
}

export const HEADLINE_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "headline",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  // Nominal radius is the mid depth tier; each target carries its own.
  simulation: {
    maxActiveTargets: HEADLINE_ACTIVE_TARGETS,
    targetRadiusAngleUnits: HEADLINE_DEPTH_RADIUS_UNITS.medium,
    spawnAreaWidthUnits: HEADLINE_HALF_WIDTH_UNITS * 2,
    spawnAreaHeightUnits: HEADLINE_MAX_PITCH_UNITS - HEADLINE_MIN_PITCH_UNITS,
    minTargetSeparationUnits: 200_000,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const HEADLINE_DEV_V0_ENTRY: ScenarioEntry = {
  definition: HEADLINE_DEV_V0_DEFINITION,
  presentation: {
    title: "Headshot Lane",
    subtitle: "Moving Head-Height Precision",
    description:
      "Hit small head-level targets as they strafe horizontally at different depths. Trains first-shot accuracy against moving enemies.",
    category: "flick",
    thumbnailUrl: "/thumbnails/headline.webp",
    tags: ["headline", "flick", "moving", "depth", "headshot", "practice"],
  },
};

defaultScenarioRegistry.register(HEADLINE_DEV_V0_ENTRY);

interface LiveTarget {
  readonly id: number;
  x: number;
  readonly y: number;
  readonly depth: HeadlineDepth;
  velocity: number;
}

export class HeadlineScenarioEngine {
  private readonly halfWidth: number;
  private live: LiveTarget[] = [];
  private pendingRespawnTicks: number[] = [];
  private nextTargetId = 1;

  constructor(
    definition: RankedScenarioDefinition = HEADLINE_DEV_V0_DEFINITION,
  ) {
    this.halfWidth = Math.floor(definition.simulation.spawnAreaWidthUnits / 2);
  }

  public initialize(prng: PrngV1): readonly HeadlineTarget[] {
    this.live = [];
    this.pendingRespawnTicks = [];
    this.nextTargetId = 1;
    for (let i = 0; i < HEADLINE_ACTIVE_TARGETS; i++) {
      this.spawnTarget(prng);
    }
    return this.getActiveTargets();
  }

  /** Slides every target one step and releases any due replacements. */
  public tick(currentTick: number, prng: PrngV1): HeadlineTickResult {
    for (const target of this.live) {
      target.x += target.velocity;
      if (target.x > this.halfWidth) {
        target.x = this.halfWidth - (target.x - this.halfWidth);
        target.velocity = -target.velocity;
      } else if (target.x < -this.halfWidth) {
        target.x = -this.halfWidth + (-this.halfWidth - target.x);
        target.velocity = -target.velocity;
      }
    }

    const spawned: HeadlineTarget[] = [];
    const stillPending: number[] = [];
    for (const readyTick of this.pendingRespawnTicks) {
      if (currentTick >= readyTick) {
        spawned.push(this.spawnTarget(prng));
      } else {
        stillPending.push(readyTick);
      }
    }
    this.pendingRespawnTicks = stillPending;

    return { spawned };
  }

  public getActiveTargets(): readonly HeadlineTarget[] {
    return Object.freeze(this.live.map((t) => this.toSpec(t)));
  }

  /**
   * Removes a killed target and queues its replacement. The replacement is
   * deliberately delayed rather than instant, so the player gets a beat to
   * reacquire instead of a new target materialising under the crosshair.
   */
  public onTargetHit(
    targetId: number,
    currentTick: number,
    prng: PrngV1,
  ): boolean {
    const idx = this.live.findIndex((t) => t.id === targetId);
    if (idx === -1) return false;

    this.live.splice(idx, 1);
    this.pendingRespawnTicks.push(
      currentTick +
        prng.nextRange(
          HEADLINE_MIN_RESPAWN_TICKS,
          HEADLINE_MAX_RESPAWN_TICKS + 1,
        ),
    );
    return true;
  }

  public getActiveCount(): number {
    return this.live.length;
  }

  private toSpec(target: LiveTarget): HeadlineTarget {
    return {
      id: target.id,
      xAngleUnits: wrapYaw(target.x),
      yAngleUnits: target.y,
      radiusAngleUnits: HEADLINE_DEPTH_RADIUS_UNITS[target.depth],
      depth: target.depth,
      velocityUnitsPerTick: target.velocity,
    };
  }

  private spawnTarget(prng: PrngV1): HeadlineTarget {
    const depth = HEADLINE_DEPTHS[prng.nextRange(0, HEADLINE_DEPTHS.length)]!;
    const [minSpeed, maxSpeed] = HEADLINE_DEPTH_SPEED_UNITS_PER_TICK[depth];
    const speed = prng.nextRange(minSpeed, maxSpeed + 1);
    const goingRight = prng.nextRange(0, 2) === 0;

    const target: LiveTarget = {
      id: this.nextTargetId++,
      x: prng.nextRange(-this.halfWidth, this.halfWidth + 1),
      y: prng.nextRange(HEADLINE_MIN_PITCH_UNITS, HEADLINE_MAX_PITCH_UNITS + 1),
      depth,
      velocity: goingRight ? speed : -speed,
    };

    this.live.push(target);
    return this.toSpec(target);
  }
}
