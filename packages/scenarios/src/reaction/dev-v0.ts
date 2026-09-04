import { type PrngV1, wrapYaw } from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import type {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

export const REACTION_TARGET_LIFETIME_TICKS = 96;
export const REACTION_MIN_DELAY_TICKS = 32;
export const REACTION_MAX_DELAY_TICKS = 128;

export const REACTION_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "reaction",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: 1,
    targetRadiusAngleUnits: 28_000,
    spawnAreaWidthUnits: 1_400_000,
    spawnAreaHeightUnits: 700_000,
    minTargetSeparationUnits: 0,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const REACTION_DEV_V0_ENTRY: ScenarioEntry = {
  definition: REACTION_DEV_V0_DEFINITION,
  presentation: {
    title: "Reaction (Dev v0)",
    subtitle: "Visual Reaction and Acquisition",
    description:
      "React to a target after a deterministic hidden delay, acquire it, and click before it expires.",
    category: "flick",
    thumbnailUrl: "/thumbnails/reaction.webp",
    tags: ["reaction", "acquisition", "timing", "practice"],
  },
};

defaultScenarioRegistry.register(REACTION_DEV_V0_ENTRY);

export interface ReactionTickResult {
  readonly spawned: TargetSpawnSpec | null;
  readonly expired: TargetSpawnSpec | null;
}

export class ReactionScenarioEngine {
  private readonly radiusUnits: number;
  private readonly areaWidth: number;
  private readonly areaHeight: number;
  private activeTarget: TargetSpawnSpec | null = null;
  private nextSpawnTick = 0;
  private nextTargetId = 1;

  constructor(
    definition: RankedScenarioDefinition = REACTION_DEV_V0_DEFINITION,
  ) {
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.areaWidth = definition.simulation.spawnAreaWidthUnits;
    this.areaHeight = definition.simulation.spawnAreaHeightUnits;
  }

  public initialize(prng: PrngV1, currentTick = 0): void {
    this.activeTarget = null;
    this.nextTargetId = 1;
    this.scheduleNext(currentTick, prng);
  }

  public tick(currentTick: number, prng: PrngV1): ReactionTickResult {
    let expired: TargetSpawnSpec | null = null;
    let spawned: TargetSpawnSpec | null = null;
    if (
      this.activeTarget?.lifetimeTicks !== undefined &&
      currentTick >= this.activeTarget.lifetimeTicks
    ) {
      expired = this.activeTarget;
      this.activeTarget = null;
      this.scheduleNext(currentTick, prng);
    }
    if (!this.activeTarget && currentTick >= this.nextSpawnTick) {
      spawned = this.spawn(currentTick, prng);
      this.activeTarget = spawned;
    }
    return { spawned, expired };
  }

  public getActiveTargets(): readonly TargetSpawnSpec[] {
    return this.activeTarget ? [this.activeTarget] : [];
  }

  public onTargetHit(
    targetId: number,
    currentTick: number,
    prng: PrngV1,
  ): boolean {
    if (this.activeTarget?.id !== targetId) return false;
    this.activeTarget = null;
    this.scheduleNext(currentTick, prng);
    return true;
  }

  private scheduleNext(currentTick: number, prng: PrngV1): void {
    this.nextSpawnTick =
      currentTick +
      prng.nextRange(REACTION_MIN_DELAY_TICKS, REACTION_MAX_DELAY_TICKS + 1);
  }

  private spawn(currentTick: number, prng: PrngV1): TargetSpawnSpec {
    const halfW = Math.floor(this.areaWidth / 2);
    const halfH = Math.floor(this.areaHeight / 2);
    return {
      id: this.nextTargetId++,
      xAngleUnits: wrapYaw(prng.nextRange(-halfW, halfW + 1)),
      yAngleUnits: prng.nextRange(-halfH, halfH + 1),
      radiusAngleUnits: this.radiusUnits,
      lifetimeTicks: currentTick + REACTION_TARGET_LIFETIME_TICKS,
    };
  }
}
