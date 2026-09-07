import {
  FULL_TURN_UNITS,
  HALF_TURN_UNITS,
  PrngV1,
  clampPitch,
  wrapYaw,
} from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import type {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

/**
 * 180 Flick: destroy a target, turn roughly all the way around, acquire the
 * next one, repeat.
 *
 * The next target is placed relative to the *previous target's* yaw rather
 * than at one of two fixed points, and the turn is 165-195 deg rather than
 * exactly 180. Both details exist to stop the exercise degenerating into
 * muscle memory for two memorised positions -- the player has to actually
 * find the target after each turn.
 *
 * This mode needs unrestricted yaw. Camera bounds are derived from the spawn
 * area, so the definition declares a full turn of width to lift the clamp.
 */

/** Spec: 2.5 deg diameter, so a 1.25 deg radius. */
export const TURN180_RADIUS_UNITS = 58_254;
/** Spec: each turn is 165-195 deg. */
export const TURN180_MIN_TURN_UNITS = 7_690_224;
export const TURN180_MAX_TURN_UNITS = 9_086_992;
/** Spec: pitch varies -15..+15 deg so the turn is not purely horizontal. */
export const TURN180_MAX_PITCH_UNITS = 699_051;

export const TURN180_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "turn180",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: 1,
    targetRadiusAngleUnits: TURN180_RADIUS_UNITS,
    // A full turn of spawn width is what unlocks unrestricted yaw.
    spawnAreaWidthUnits: FULL_TURN_UNITS,
    spawnAreaHeightUnits: TURN180_MAX_PITCH_UNITS * 2,
    minTargetSeparationUnits: TURN180_MIN_TURN_UNITS,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const TURN180_DEV_V0_ENTRY: ScenarioEntry = {
  definition: TURN180_DEV_V0_DEFINITION,
  presentation: {
    title: "180 Flick",
    subtitle: "Turn and Reacquire",
    description:
      "Destroy a target, turn roughly 180 degrees, acquire the next one, and repeat. Trains wide turns and reacquisition.",
    category: "flick",
    thumbnailUrl: "/thumbnails/turn180.webp",
    tags: ["turn180", "flick", "wide", "turn", "practice"],
  },
};

defaultScenarioRegistry.register(TURN180_DEV_V0_ENTRY);

export class Turn180ScenarioEngine {
  private readonly radiusUnits: number;
  private active: TargetSpawnSpec | null = null;
  private nextTargetId = 1;
  /** Unwrapped yaw of the current target, used to build the next turn. */
  private currentYaw = 0;

  constructor(
    definition: RankedScenarioDefinition = TURN180_DEV_V0_DEFINITION,
  ) {
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
  }

  public initialize(_prng: PrngV1): TargetSpawnSpec {
    this.nextTargetId = 1;
    this.currentYaw = 0;
    this.active = {
      id: this.nextTargetId++,
      xAngleUnits: wrapYaw(0),
      yAngleUnits: clampPitch(0),
      radiusAngleUnits: this.radiusUnits,
    };
    return this.active;
  }

  public getActiveTargets(): readonly TargetSpawnSpec[] {
    return this.active ? [this.active] : [];
  }

  public onTargetHit(targetId: number, prng: PrngV1): TargetSpawnSpec | null {
    if (this.active?.id !== targetId) return null;

    const turn = prng.nextRange(
      TURN180_MIN_TURN_UNITS,
      TURN180_MAX_TURN_UNITS + 1,
    );
    // Alternate the turn direction randomly so the player cannot settle into
    // always sweeping the same way.
    const signedTurn = prng.nextRange(0, 2) === 0 ? -turn : turn;
    this.currentYaw += signedTurn;

    this.active = {
      id: this.nextTargetId++,
      xAngleUnits: wrapYaw(this.currentYaw),
      yAngleUnits: clampPitch(
        prng.nextRange(-TURN180_MAX_PITCH_UNITS, TURN180_MAX_PITCH_UNITS + 1),
      ),
      radiusAngleUnits: this.radiusUnits,
    };
    return this.active;
  }

  /**
   * Shortest-path angle between two consecutive targets, which is what the
   * player actually has to travel. Exposed for tests and analytics.
   */
  public static shortestTurnBetween(fromYaw: number, toYaw: number): number {
    const raw =
      (((toYaw - fromYaw) % FULL_TURN_UNITS) + FULL_TURN_UNITS) %
      FULL_TURN_UNITS;
    return raw > HALF_TURN_UNITS ? FULL_TURN_UNITS - raw : raw;
  }
}
