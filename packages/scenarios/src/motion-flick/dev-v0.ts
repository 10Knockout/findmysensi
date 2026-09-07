import { PrngV1, clampPitch, wrapYaw } from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import type {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

/**
 * Motion Flick: hit the centre anchor, then flick out to a target that is
 * already moving, intercept it with a single click, and come back.
 *
 *   centre -> moving target -> centre -> moving target -> ...
 *
 * The distinction from Sphere Track and Strafe Track matters: this is
 * intercept-and-click, not sustained tracking. One well-timed shot while the
 * crosshair is over the target ends the engagement, so what is trained is
 * predicting where a moving target *will be*, not riding it.
 */

/** Spec: 2.2 deg diameter, so a 1.1 deg radius. */
export const MOTION_FLICK_RADIUS_UNITS = 51_264;
/** Spec: the moving target starts 12-36 deg out from centre. */
export const MOTION_FLICK_MIN_OFFSET_UNITS = 559_241;
export const MOTION_FLICK_MAX_OFFSET_UNITS = 1_677_722;
/** Spec: it drifts at 14-24 deg/sec, here in units per 128 Hz tick. */
export const MOTION_FLICK_MIN_SPEED_UNITS_PER_TICK = 5_097;
export const MOTION_FLICK_MAX_SPEED_UNITS_PER_TICK = 8_738;
/** Spec: the moving target lives 3.0 s before it gets away. */
export const MOTION_FLICK_LIFETIME_TICKS = 384;

/** The shared front-facing play area: +/-42 deg by +/-27 deg. */
export const MOTION_FLICK_HALF_WIDTH_UNITS = 1_957_342;
export const MOTION_FLICK_HALF_HEIGHT_UNITS = 1_258_291;

export const MOTION_FLICK_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "motion-flick",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: 1,
    targetRadiusAngleUnits: MOTION_FLICK_RADIUS_UNITS,
    spawnAreaWidthUnits: MOTION_FLICK_HALF_WIDTH_UNITS * 2,
    spawnAreaHeightUnits: MOTION_FLICK_HALF_HEIGHT_UNITS * 2,
    minTargetSeparationUnits: MOTION_FLICK_MIN_OFFSET_UNITS,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const MOTION_FLICK_DEV_V0_ENTRY: ScenarioEntry = {
  definition: MOTION_FLICK_DEV_V0_DEFINITION,
  presentation: {
    title: "Motion Flick",
    subtitle: "Intercept and Click",
    description:
      "Hit the centre anchor, then flick to a moving target and intercept it with a single shot. Reacquire the centre and repeat.",
    category: "flick",
    thumbnailUrl: "/thumbnails/motion-flick.webp",
    tags: ["motion-flick", "flick", "moving", "intercept", "practice"],
  },
};

defaultScenarioRegistry.register(MOTION_FLICK_DEV_V0_ENTRY);

export interface MotionFlickTickResult {
  /** Set when the moving target escaped instead of being intercepted. */
  readonly expired: TargetSpawnSpec | null;
  readonly spawned: TargetSpawnSpec | null;
}

interface MovingState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly deadlineTick: number;
}

export class MotionFlickScenarioEngine {
  private readonly radiusUnits: number;
  private readonly halfWidth: number;
  private readonly halfHeight: number;
  private active: TargetSpawnSpec | null = null;
  private moving: MovingState | null = null;
  private nextTargetId = 1;
  private atCentre = true;

  constructor(
    definition: RankedScenarioDefinition = MOTION_FLICK_DEV_V0_DEFINITION,
  ) {
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.halfWidth = Math.floor(definition.simulation.spawnAreaWidthUnits / 2);
    this.halfHeight = Math.floor(
      definition.simulation.spawnAreaHeightUnits / 2,
    );
  }

  public initialize(_prng: PrngV1): TargetSpawnSpec {
    this.nextTargetId = 1;
    this.atCentre = true;
    this.moving = null;
    this.active = this.spawnCentre();
    return this.active;
  }

  public getActiveTargets(): readonly TargetSpawnSpec[] {
    return this.active ? [this.active] : [];
  }

  /** Drifts the moving target and retires it if it outlived its window. */
  public tick(currentTick: number, _prng: PrngV1): MotionFlickTickResult {
    if (!this.moving || !this.active) return { expired: null, spawned: null };

    if (currentTick >= this.moving.deadlineTick) {
      const escaped = this.active;
      this.moving = null;
      this.active = this.spawnCentre();
      this.atCentre = true;
      return { expired: escaped, spawned: this.active };
    }

    this.moving.x += this.moving.vx;
    this.moving.y += this.moving.vy;

    // Reflect off the play-area edge so the target stays interceptable.
    if (Math.abs(this.moving.x) > this.halfWidth) {
      this.moving.x = Math.sign(this.moving.x) * this.halfWidth;
      this.moving.vx = -this.moving.vx;
    }
    if (Math.abs(this.moving.y) > this.halfHeight) {
      this.moving.y = Math.sign(this.moving.y) * this.halfHeight;
      this.moving.vy = -this.moving.vy;
    }

    this.active = {
      id: this.active.id,
      xAngleUnits: wrapYaw(Math.round(this.moving.x)),
      yAngleUnits: clampPitch(Math.round(this.moving.y)),
      radiusAngleUnits: this.radiusUnits,
      lifetimeTicks: this.moving.deadlineTick,
    };

    return { expired: null, spawned: null };
  }

  public onTargetHit(
    targetId: number,
    currentTick: number,
    prng: PrngV1,
  ): TargetSpawnSpec | null {
    if (this.active?.id !== targetId) return null;

    if (this.atCentre) {
      this.active = this.spawnMoving(currentTick, prng);
    } else {
      this.moving = null;
      this.active = this.spawnCentre();
    }
    this.atCentre = !this.atCentre;
    return this.active;
  }

  private spawnCentre(): TargetSpawnSpec {
    return {
      id: this.nextTargetId++,
      xAngleUnits: wrapYaw(0),
      yAngleUnits: clampPitch(0),
      radiusAngleUnits: this.radiusUnits,
    };
  }

  private spawnMoving(currentTick: number, prng: PrngV1): TargetSpawnSpec {
    let x = MOTION_FLICK_MIN_OFFSET_UNITS;
    let y = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      const cx = prng.nextRange(
        -MOTION_FLICK_MAX_OFFSET_UNITS,
        MOTION_FLICK_MAX_OFFSET_UNITS + 1,
      );
      const cy = prng.nextRange(
        -MOTION_FLICK_MAX_OFFSET_UNITS,
        MOTION_FLICK_MAX_OFFSET_UNITS + 1,
      );
      const distance = Math.sqrt(cx * cx + cy * cy);
      if (
        distance >= MOTION_FLICK_MIN_OFFSET_UNITS &&
        distance <= MOTION_FLICK_MAX_OFFSET_UNITS &&
        Math.abs(cx) <= this.halfWidth &&
        Math.abs(cy) <= this.halfHeight
      ) {
        x = cx;
        y = cy;
        break;
      }
    }

    const speed = prng.nextRange(
      MOTION_FLICK_MIN_SPEED_UNITS_PER_TICK,
      MOTION_FLICK_MAX_SPEED_UNITS_PER_TICK + 1,
    );
    // Pick a direction on an eighth-turn lattice: deterministic, and avoids
    // trigonometry in a path that has to replay bit-identically.
    const octant = prng.nextRange(0, 8);
    const diagonal = Math.round(speed * 0.7071);
    const headings: readonly (readonly [number, number])[] = [
      [speed, 0],
      [diagonal, diagonal],
      [0, speed],
      [-diagonal, diagonal],
      [-speed, 0],
      [-diagonal, -diagonal],
      [0, -speed],
      [diagonal, -diagonal],
    ];
    const [vx, vy] = headings[octant]!;

    this.moving = {
      x,
      y,
      vx,
      vy,
      deadlineTick: currentTick + MOTION_FLICK_LIFETIME_TICKS,
    };

    return {
      id: this.nextTargetId++,
      xAngleUnits: wrapYaw(x),
      yAngleUnits: clampPitch(y),
      radiusAngleUnits: this.radiusUnits,
      lifetimeTicks: this.moving.deadlineTick,
    };
  }
}
