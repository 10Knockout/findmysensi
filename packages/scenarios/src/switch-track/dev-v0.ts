import {
  FULL_TURN_UNITS,
  createAngleUnits,
  shortestSignedAngleDelta,
  type PrngV1,
  wrapYaw,
} from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import type {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

export const SWITCH_TRACK_HOLD_TICKS = 32;
const SWITCH_TRACK_SPEEDS = [900, 1_300, 1_700];

export const SWITCH_TRACK_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "switch-track",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: 1,
    targetRadiusAngleUnits: 32_000,
    spawnAreaWidthUnits: 1_400_000,
    spawnAreaHeightUnits: 700_000,
    minTargetSeparationUnits: 300_000,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const SWITCH_TRACK_DEV_V0_ENTRY: ScenarioEntry = {
  definition: SWITCH_TRACK_DEV_V0_DEFINITION,
  presentation: {
    title: "Switch Track (Dev v0)",
    subtitle: "Acquire, Track, Switch",
    description:
      "Acquire a moving target, hold it steadily, then switch and reacquire the next target.",
    category: "switching",
    thumbnailUrl: "/thumbnails/switch-track.webp",
    tags: ["switching", "tracking", "acquisition", "practice"],
  },
};

defaultScenarioRegistry.register(SWITCH_TRACK_DEV_V0_ENTRY);

interface SwitchTarget extends TargetSpawnSpec {
  readonly velocityUnitsPerTick: number;
  readonly spawnTick: number;
}

export interface SwitchTrackTickResult {
  readonly errorUnits: number;
  readonly onTarget: boolean;
  readonly acquisitionTicks: number | null;
  readonly switched: boolean;
}

export class SwitchTrackScenarioEngine {
  private readonly radiusUnits: number;
  private readonly halfWidth: number;
  private readonly halfHeight: number;
  private readonly minSeparation: number;
  private target: SwitchTarget | null = null;
  private nextTargetId = 1;
  private consecutiveOnTargetTicks = 0;
  private acquired = false;

  constructor(
    definition: RankedScenarioDefinition = SWITCH_TRACK_DEV_V0_DEFINITION,
  ) {
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.halfWidth = Math.floor(definition.simulation.spawnAreaWidthUnits / 2);
    this.halfHeight = Math.floor(
      definition.simulation.spawnAreaHeightUnits / 2,
    );
    this.minSeparation = definition.simulation.minTargetSeparationUnits;
  }

  public initialize(prng: PrngV1): TargetSpawnSpec {
    this.nextTargetId = 1;
    this.target = this.spawn(prng, 0, null);
    this.consecutiveOnTargetTicks = 0;
    this.acquired = false;
    return this.target;
  }

  public tick(
    currentTick: number,
    playerYaw: number,
    playerPitch: number,
    prng: PrngV1,
  ): SwitchTrackTickResult {
    if (!this.target) this.target = this.spawn(prng, currentTick, null);
    const localX =
      this.target.xAngleUnits > FULL_TURN_UNITS / 2
        ? this.target.xAngleUnits - FULL_TURN_UNITS
        : this.target.xAngleUnits;
    let nextX = localX + this.target.velocityUnitsPerTick;
    let velocity = this.target.velocityUnitsPerTick;
    if (nextX > this.halfWidth || nextX < -this.halfWidth) {
      velocity = -velocity;
      nextX = Math.max(-this.halfWidth, Math.min(this.halfWidth, nextX));
    }
    this.target = {
      ...this.target,
      xAngleUnits: wrapYaw(nextX),
      velocityUnitsPerTick: velocity,
    };

    const dx = shortestSignedAngleDelta(
      createAngleUnits(this.target.xAngleUnits),
      wrapYaw(playerYaw),
    );
    const dy = playerPitch - this.target.yAngleUnits;
    const errorUnits = Math.sqrt(dx * dx + dy * dy);
    const onTarget = errorUnits <= this.radiusUnits;
    let acquisitionTicks: number | null = null;
    if (onTarget) {
      this.consecutiveOnTargetTicks++;
      if (!this.acquired) {
        this.acquired = true;
        acquisitionTicks = currentTick - this.target.spawnTick;
      }
    } else {
      this.consecutiveOnTargetTicks = 0;
    }

    const switched = this.consecutiveOnTargetTicks >= SWITCH_TRACK_HOLD_TICKS;
    if (switched) {
      const previousX = this.target.xAngleUnits;
      this.target = this.spawn(prng, currentTick, previousX);
      this.consecutiveOnTargetTicks = 0;
      this.acquired = false;
    }
    return { errorUnits, onTarget, acquisitionTicks, switched };
  }

  public getTarget(): TargetSpawnSpec {
    if (!this.target)
      throw new Error("Switch Track must be initialized first.");
    return this.target;
  }

  private spawn(
    prng: PrngV1,
    currentTick: number,
    previousX: number | null,
  ): SwitchTarget {
    let localX = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      localX = prng.nextRange(-this.halfWidth, this.halfWidth + 1);
      if (
        previousX === null ||
        Math.abs(
          shortestSignedAngleDelta(
            createAngleUnits(previousX),
            wrapYaw(localX),
          ),
        ) >= this.minSeparation
      ) {
        break;
      }
    }
    const speed =
      SWITCH_TRACK_SPEEDS[prng.nextRange(0, SWITCH_TRACK_SPEEDS.length)]!;
    return {
      id: this.nextTargetId++,
      xAngleUnits: wrapYaw(localX),
      yAngleUnits: prng.nextRange(-this.halfHeight, this.halfHeight + 1),
      radiusAngleUnits: this.radiusUnits,
      velocityUnitsPerTick: prng.nextRange(0, 2) === 0 ? -speed : speed,
      spawnTick: currentTick,
    };
  }
}
