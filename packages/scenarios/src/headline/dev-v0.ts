import { PrngV1, wrapYaw } from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

/**
 * Headline: Controlled head-height corridor with meaningful vertical variation.
 * Targets spawn along a horizontal band simulating head-height crosshair placement.
 * Tests horizontal flick accuracy and the ability to maintain consistent crosshair height.
 */

/** Vertical band half-height — targets cluster near the horizontal centerline */
const HEADLINE_VERTICAL_BAND = 180000; // ~3.9 deg total vertical spread

export const HEADLINE_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "headline",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: 1,
    targetRadiusAngleUnits: 20000, // ~0.43 deg
    spawnAreaWidthUnits: 1800000, // ~38.6 deg — wide horizontal spread
    spawnAreaHeightUnits: HEADLINE_VERTICAL_BAND,
    minTargetSeparationUnits: 200000, // force wide horizontal flicks
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
    title: "Headline (Dev v0)",
    subtitle: "Horizontal Flick Corridor",
    description:
      "Targets spawn along a head-height corridor. Tests horizontal crosshair placement and flick timing.",
    category: "flick",
    thumbnailUrl: "/thumbnails/headline.webp",
    tags: ["headline", "flick", "horizontal", "crosshair", "practice"],
  },
};

defaultScenarioRegistry.register(HEADLINE_DEV_V0_ENTRY);

export class HeadlineScenarioEngine {
  private readonly radiusUnits: number;
  private readonly areaWidth: number;
  private readonly areaHeight: number;
  private readonly minSep: number;
  private activeTargets: TargetSpawnSpec[] = [];
  private nextTargetId: number = 1;
  private lastX: number | null = null;

  constructor(
    definition: RankedScenarioDefinition = HEADLINE_DEV_V0_DEFINITION,
  ) {
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.areaWidth = definition.simulation.spawnAreaWidthUnits;
    this.areaHeight = definition.simulation.spawnAreaHeightUnits;
    this.minSep = definition.simulation.minTargetSeparationUnits;
  }

  public initialize(prng: PrngV1): readonly TargetSpawnSpec[] {
    this.activeTargets = [];
    this.nextTargetId = 1;
    this.lastX = null;

    this.spawnTarget(prng);
    return this.getActiveTargets();
  }

  public getActiveTargets(): readonly TargetSpawnSpec[] {
    return Object.freeze([...this.activeTargets]);
  }

  public onTargetHit(targetId: number, prng: PrngV1): TargetSpawnSpec | null {
    const hitIdx = this.activeTargets.findIndex((t) => t.id === targetId);
    if (hitIdx === -1) return null;

    const hitTarget = this.activeTargets[hitIdx]!;
    this.lastX = hitTarget.xAngleUnits;
    this.activeTargets.splice(hitIdx, 1);

    return this.spawnTarget(prng);
  }

  private spawnTarget(prng: PrngV1): TargetSpawnSpec {
    const halfW = Math.floor(this.areaWidth / 2);
    const halfH = Math.floor(this.areaHeight / 2);

    let x: number;
    let attempts = 0;
    do {
      // Wrap immediately: collision testing requires every stored target's
      // xAngleUnits to already be in [0, FULL_TURN_UNITS), matching Grid's
      // slot generation. Wrapping here keeps this separation check
      // consistent with lastX, which is itself derived from a stored,
      // already-wrapped target.
      x = wrapYaw(prng.nextRange(-halfW, halfW + 1));
      attempts++;
    } while (
      attempts < 100 &&
      this.lastX !== null &&
      Math.abs(x - this.lastX) < this.minSep
    );

    // Vertical variation — constrained to the head-height band
    const y = prng.nextRange(-halfH, halfH + 1);

    const newTarget: TargetSpawnSpec = {
      id: this.nextTargetId++,
      xAngleUnits: x,
      yAngleUnits: y,
      radiusAngleUnits: this.radiusUnits,
    };

    this.activeTargets.push(newTarget);
    return newTarget;
  }
}
