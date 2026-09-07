import { PrngV1, clampPitch, wrapYaw } from "@findmysensi/aim-core";
import {
  MEDIUM_SPAWN_HALF_HEIGHT_UNITS,
  MEDIUM_SPAWN_HALF_WIDTH_UNITS,
} from "../front-facing-area.js";
import { defaultScenarioRegistry } from "../registry.js";
import type {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

/**
 * Anchor Flick: return to the centre after every wide flick.
 *
 *   centre -> peripheral -> centre -> peripheral -> ...
 *
 * Because every outward flick starts from the same known point, the distance
 * travelled is directly comparable between repetitions. That is what makes it
 * possible to say anything useful about a player's wide-flick consistency --
 * a chain of arbitrary hops between random points would not.
 *
 * This is the long-range counterpart to Micro Flick: identical structure,
 * 18-40 deg of travel instead of 4-12.
 */

/** Spec: 2.5 deg diameter, so a 1.25 deg radius. */
export const ANCHOR_FLICK_RADIUS_UNITS = 58_254;
/** The peripheral target lands 18-23 deg from centre. */
export const ANCHOR_FLICK_MIN_OFFSET_UNITS = 838_861;
export const ANCHOR_FLICK_MAX_OFFSET_UNITS = 1_071_848;
/** Spec: a peripheral target expires after 1.75 s at 128 Hz. */
export const ANCHOR_FLICK_PERIPHERAL_LIFETIME_TICKS = 224;

/** The shared medium front-facing play area. */
export const ANCHOR_FLICK_HALF_WIDTH_UNITS = MEDIUM_SPAWN_HALF_WIDTH_UNITS;
export const ANCHOR_FLICK_HALF_HEIGHT_UNITS = MEDIUM_SPAWN_HALF_HEIGHT_UNITS;

export const ANCHOR_FLICK_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "anchor-flick",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: 1,
    targetRadiusAngleUnits: ANCHOR_FLICK_RADIUS_UNITS,
    spawnAreaWidthUnits: ANCHOR_FLICK_HALF_WIDTH_UNITS * 2,
    spawnAreaHeightUnits: ANCHOR_FLICK_HALF_HEIGHT_UNITS * 2,
    minTargetSeparationUnits: ANCHOR_FLICK_MIN_OFFSET_UNITS,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const ANCHOR_FLICK_DEV_V0_ENTRY: ScenarioEntry = {
  definition: ANCHOR_FLICK_DEV_V0_DEFINITION,
  presentation: {
    title: "Anchor Flick",
    subtitle: "Wide Flick and Reset",
    description:
      "Return to the centre after every wide flick. Trains repeatable target acquisition and controlled long-distance flicks.",
    category: "flick",
    thumbnailUrl: "/thumbnails/anchor-flick.webp",
    tags: ["anchor-flick", "flick", "wide", "reset", "practice"],
  },
};

defaultScenarioRegistry.register(ANCHOR_FLICK_DEV_V0_ENTRY);

export interface AnchorFlickTickResult {
  /** Set when a peripheral target timed out instead of being destroyed. */
  readonly expired: TargetSpawnSpec | null;
  /** Set when a new target appeared as a result of that expiry. */
  readonly spawned: TargetSpawnSpec | null;
}

export class AnchorFlickScenarioEngine {
  private readonly radiusUnits: number;
  private readonly minOffset: number;
  private readonly maxOffset: number;
  private readonly halfWidth: number;
  private readonly halfHeight: number;
  private active: TargetSpawnSpec | null = null;
  private nextTargetId = 1;
  private atCentre = true;

  constructor(
    definition: RankedScenarioDefinition = ANCHOR_FLICK_DEV_V0_DEFINITION,
  ) {
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.minOffset = ANCHOR_FLICK_MIN_OFFSET_UNITS;
    this.maxOffset = ANCHOR_FLICK_MAX_OFFSET_UNITS;
    this.halfWidth = Math.floor(definition.simulation.spawnAreaWidthUnits / 2);
    this.halfHeight = Math.floor(
      definition.simulation.spawnAreaHeightUnits / 2,
    );
  }

  public initialize(_prng: PrngV1): TargetSpawnSpec {
    this.nextTargetId = 1;
    this.atCentre = true;
    this.active = this.spawnCentre();
    return this.active;
  }

  public getActiveTargets(): readonly TargetSpawnSpec[] {
    return this.active ? [this.active] : [];
  }

  /**
   * Expires a peripheral target that was never destroyed and brings the
   * centre anchor back, so a missed flick still resets to a known start.
   */
  public tick(currentTick: number, _prng: PrngV1): AnchorFlickTickResult {
    const current = this.active;
    if (
      !current ||
      current.lifetimeTicks === undefined ||
      currentTick < current.lifetimeTicks
    ) {
      return { expired: null, spawned: null };
    }

    // A timed-out flick still resets to the anchor, so the next repetition
    // starts from the same known place as every other one.
    this.active = this.spawnCentre();
    this.atCentre = true;
    return { expired: current, spawned: this.active };
  }

  public onTargetHit(
    targetId: number,
    currentTick: number,
    prng: PrngV1,
  ): TargetSpawnSpec | null {
    if (this.active?.id !== targetId) return null;
    this.active = this.atCentre
      ? this.spawnPeripheral(currentTick, prng)
      : this.spawnCentre();
    this.atCentre = !this.atCentre;
    return this.active;
  }

  private spawnCentre(): TargetSpawnSpec {
    // The centre anchor never times out: it is the reset point, and expiring
    // it would leave the player with nothing to aim at.
    return {
      id: this.nextTargetId++,
      xAngleUnits: wrapYaw(0),
      yAngleUnits: clampPitch(0),
      radiusAngleUnits: this.radiusUnits,
    };
  }

  private spawnPeripheral(currentTick: number, prng: PrngV1): TargetSpawnSpec {
    let dx = 0;
    let dy = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      dx = prng.nextRange(-this.maxOffset, this.maxOffset + 1);
      dy = prng.nextRange(-this.maxOffset, this.maxOffset + 1);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (
        distance >= this.minOffset &&
        distance <= this.maxOffset &&
        Math.abs(dx) <= this.halfWidth &&
        Math.abs(dy) <= this.halfHeight
      ) {
        return this.peripheralAt(dx, dy, currentTick);
      }
    }

    // Deterministic fallback: a straight horizontal flick of the minimum
    // distance is always inside the play area.
    return this.peripheralAt(this.minOffset, 0, currentTick);
  }

  private peripheralAt(
    dx: number,
    dy: number,
    currentTick: number,
  ): TargetSpawnSpec {
    return {
      id: this.nextTargetId++,
      xAngleUnits: wrapYaw(dx),
      yAngleUnits: clampPitch(dy),
      radiusAngleUnits: this.radiusUnits,
      // Absolute deadline, matching how the other timed scenarios store it.
      lifetimeTicks: currentTick + ANCHOR_FLICK_PERIPHERAL_LIFETIME_TICKS,
    };
  }
}
