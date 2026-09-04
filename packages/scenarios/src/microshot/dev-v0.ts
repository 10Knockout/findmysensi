import { clampPitch, type PrngV1, wrapYaw } from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import type {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

export const MICROSHOT_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "microshot",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: 1,
    targetRadiusAngleUnits: 10_000,
    spawnAreaWidthUnits: 360_000,
    spawnAreaHeightUnits: 360_000,
    minTargetSeparationUnits: 50_000,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const MICROSHOT_DEV_V0_ENTRY: ScenarioEntry = {
  definition: MICROSHOT_DEV_V0_DEFINITION,
  presentation: {
    title: "Microshot (Dev v0)",
    subtitle: "Small Correction Precision",
    description:
      "Make fast, precise micro-corrections as each tiny target appears near your last hit.",
    category: "precision",
    thumbnailUrl: "/thumbnails/microshot.webp",
    tags: ["microshot", "precision", "correction", "practice"],
  },
};

defaultScenarioRegistry.register(MICROSHOT_DEV_V0_ENTRY);

export class MicroshotScenarioEngine {
  private readonly radiusUnits: number;
  private readonly maxOffset: number;
  private readonly minOffset: number;
  private activeTarget: TargetSpawnSpec | null = null;
  private nextTargetId = 1;

  constructor(
    definition: RankedScenarioDefinition = MICROSHOT_DEV_V0_DEFINITION,
  ) {
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.maxOffset = Math.floor(definition.simulation.spawnAreaWidthUnits / 2);
    this.minOffset = definition.simulation.minTargetSeparationUnits;
  }

  public initialize(prng: PrngV1): TargetSpawnSpec {
    this.nextTargetId = 1;
    this.activeTarget = this.spawnNear(0, 0, prng);
    return this.activeTarget;
  }

  public getActiveTargets(): readonly TargetSpawnSpec[] {
    return this.activeTarget ? [this.activeTarget] : [];
  }

  public onTargetHit(
    targetId: number,
    playerYaw: number,
    playerPitch: number,
    prng: PrngV1,
  ): TargetSpawnSpec | null {
    if (this.activeTarget?.id !== targetId) return null;
    this.activeTarget = this.spawnNear(playerYaw, playerPitch, prng);
    return this.activeTarget;
  }

  private spawnNear(
    anchorYaw: number,
    anchorPitch: number,
    prng: PrngV1,
  ): TargetSpawnSpec {
    let dx = 0;
    let dy = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      dx = prng.nextRange(-this.maxOffset, this.maxOffset + 1);
      dy = prng.nextRange(-this.maxOffset, this.maxOffset + 1);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance >= this.minOffset && distance <= this.maxOffset) break;
    }
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < this.minOffset || distance > this.maxOffset) {
      dx = this.minOffset;
      dy = 0;
    }
    return {
      id: this.nextTargetId++,
      xAngleUnits: wrapYaw(anchorYaw + dx),
      yAngleUnits: clampPitch(anchorPitch + dy),
      radiusAngleUnits: this.radiusUnits,
    };
  }
}
