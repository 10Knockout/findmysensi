import { PrngV1, wrapYaw } from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

/**
 * Pinpoint: Six tiny stationary targets testing precision and planning.
 * Smaller targets than Grid, with a miss penalty reducing score.
 * Targets have a lifetime — if not hit within lifetimeTicks they despawn
 * and count as expired (miss).
 */

export const PINPOINT_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "pinpoint",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60, // 60 seconds at 128 Hz
  simulation: {
    maxActiveTargets: 6,
    targetRadiusAngleUnits: 12000, // ~0.26 deg — much smaller than Grid's 25000
    spawnAreaWidthUnits: 1600000, // ~34.3 deg horizontal
    spawnAreaHeightUnits: 900000, // ~19.3 deg vertical
    minTargetSeparationUnits: 80000,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const PINPOINT_DEV_V0_ENTRY: ScenarioEntry = {
  definition: PINPOINT_DEV_V0_DEFINITION,
  presentation: {
    title: "Pinpoint (Dev v0)",
    subtitle: "6-Target Precision Practice",
    description:
      "Tiny stationary targets that test precision clicking and planning. Targets expire if not hit in time.",
    category: "precision",
    thumbnailUrl: "/thumbnails/pinpoint.webp",
    tags: ["pinpoint", "precision", "accuracy", "practice"],
  },
};

defaultScenarioRegistry.register(PINPOINT_DEV_V0_ENTRY);

export const PINPOINT_TARGET_LIFETIME_TICKS = 128 * 5; // 5 seconds per target

export class PinpointScenarioEngine {
  private readonly radiusUnits: number;
  private readonly maxActive: number;
  private readonly areaWidth: number;
  private readonly areaHeight: number;
  private readonly minSep: number;
  private activeTargets: TargetSpawnSpec[] = [];
  private nextTargetId: number = 1;

  constructor(
    definition: RankedScenarioDefinition = PINPOINT_DEV_V0_DEFINITION,
  ) {
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.maxActive = definition.simulation.maxActiveTargets;
    this.areaWidth = definition.simulation.spawnAreaWidthUnits;
    this.areaHeight = definition.simulation.spawnAreaHeightUnits;
    this.minSep = definition.simulation.minTargetSeparationUnits;
  }

  public initialize(
    prng: PrngV1,
    currentTick: number = 0,
  ): readonly TargetSpawnSpec[] {
    this.activeTargets = [];
    this.nextTargetId = 1;

    for (let i = 0; i < this.maxActive; i++) {
      this.spawnTarget(prng, currentTick);
    }

    return this.getActiveTargets();
  }

  public getActiveTargets(): readonly TargetSpawnSpec[] {
    return Object.freeze([...this.activeTargets]);
  }

  public onTargetHit(
    targetId: number,
    prng: PrngV1,
    currentTick: number,
  ): TargetSpawnSpec | null {
    const hitIdx = this.activeTargets.findIndex((t) => t.id === targetId);
    if (hitIdx === -1) return null;

    this.activeTargets.splice(hitIdx, 1);
    return this.spawnTarget(prng, currentTick);
  }

  /**
   * Tick lifecycle: remove expired targets and replace them.
   * Returns list of newly spawned replacement targets.
   */
  public tick(
    currentTick: number,
    prng: PrngV1,
  ): {
    expired: readonly TargetSpawnSpec[];
    spawned: readonly TargetSpawnSpec[];
  } {
    const expired: TargetSpawnSpec[] = [];
    const spawned: TargetSpawnSpec[] = [];

    // Collect expired
    this.activeTargets = this.activeTargets.filter((t) => {
      if (t.lifetimeTicks !== undefined && currentTick >= t.lifetimeTicks) {
        expired.push(t);
        return false;
      }
      return true;
    });

    // Replace expired targets
    for (let i = 0; i < expired.length; i++) {
      const replacement = this.spawnTarget(prng, currentTick);
      if (replacement) spawned.push(replacement);
    }

    return {
      expired: Object.freeze(expired),
      spawned: Object.freeze(spawned),
    };
  }

  private spawnTarget(prng: PrngV1, currentTick: number): TargetSpawnSpec {
    const halfW = Math.floor(this.areaWidth / 2);
    const halfH = Math.floor(this.areaHeight / 2);

    // Rejection-sample position with minimum separation
    let x: number;
    let y: number;
    let attempts = 0;
    do {
      // Wrap immediately: collision testing requires every stored target's
      // xAngleUnits to already be in [0, FULL_TURN_UNITS), matching Grid's
      // slot generation. Wrapping here (not after the loop) keeps this
      // separation check consistent with previously-stored, already-wrapped
      // targets.
      x = wrapYaw(prng.nextRange(-halfW, halfW + 1));
      y = prng.nextRange(-halfH, halfH + 1);
      attempts++;
    } while (attempts < 100 && this.tooClose(x, y));

    const newTarget: TargetSpawnSpec = {
      id: this.nextTargetId++,
      xAngleUnits: x,
      yAngleUnits: y,
      radiusAngleUnits: this.radiusUnits,
      lifetimeTicks: currentTick + PINPOINT_TARGET_LIFETIME_TICKS,
    };

    this.activeTargets.push(newTarget);
    return newTarget;
  }

  private tooClose(x: number, y: number): boolean {
    for (const t of this.activeTargets) {
      const dx = t.xAngleUnits - x;
      const dy = t.yAngleUnits - y;
      if (Math.sqrt(dx * dx + dy * dy) < this.minSep) return true;
    }
    return false;
  }
}
