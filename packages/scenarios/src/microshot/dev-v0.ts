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
  // Micro Flick spec: 1.6 deg diameter, alternating between a centre anchor
  // and a peripheral target 4-12 deg away. The offset band is carried in
  // minTargetSeparationUnits (4 deg) and half the spawn width (12 deg).
  simulation: {
    maxActiveTargets: 1,
    targetRadiusAngleUnits: 37_283,
    spawnAreaWidthUnits: 1_118_481,
    spawnAreaHeightUnits: 1_118_481,
    minTargetSeparationUnits: 186_414,
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
    title: "Micro Flick",
    subtitle: "Short-Range Corrections",
    description:
      "Rapidly make tiny corrections around your crosshair. Designed for precise wrist and fingertip adjustments.",
    category: "precision",
    thumbnailUrl: "/thumbnails/microshot.webp",
    tags: ["microshot", "precision", "correction", "practice"],
  },
};

defaultScenarioRegistry.register(MICROSHOT_DEV_V0_ENTRY);

/**
 * Micro Flick alternates between a fixed centre anchor and a peripheral
 * target a short distance away:
 *
 *   centre -> peripheral -> centre -> peripheral -> ...
 *
 * The centre target always sits at (0, 0), so every peripheral flick starts
 * from the same known place and the measured flick distance is meaningful.
 * That anchoring is the whole point of the exercise -- it is what separates
 * Micro Flick from a chain of arbitrary short hops, and it is what makes
 * "distance travelled" comparable between one repetition and the next.
 *
 * The only difference from Anchor Flick is the offset band: Micro Flick uses
 * 4-12 deg, Anchor Flick uses 18-40 deg.
 */
export class MicroshotScenarioEngine {
  private readonly radiusUnits: number;
  private readonly maxOffset: number;
  private readonly minOffset: number;
  private activeTarget: TargetSpawnSpec | null = null;
  private nextTargetId = 1;
  private atCentre = true;

  constructor(
    definition: RankedScenarioDefinition = MICROSHOT_DEV_V0_DEFINITION,
  ) {
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.maxOffset = Math.floor(definition.simulation.spawnAreaWidthUnits / 2);
    this.minOffset = definition.simulation.minTargetSeparationUnits;
  }

  public initialize(_prng: PrngV1): TargetSpawnSpec {
    this.nextTargetId = 1;
    this.atCentre = true;
    this.activeTarget = this.spawnCentre();
    return this.activeTarget;
  }

  public getActiveTargets(): readonly TargetSpawnSpec[] {
    return this.activeTarget ? [this.activeTarget] : [];
  }

  public onTargetHit(
    targetId: number,
    _playerYaw: number,
    _playerPitch: number,
    prng: PrngV1,
  ): TargetSpawnSpec | null {
    if (this.activeTarget?.id !== targetId) return null;
    // Just destroyed the centre target -> go outward. Just destroyed a
    // peripheral target -> come back to centre.
    this.activeTarget = this.atCentre
      ? this.spawnPeripheral(prng)
      : this.spawnCentre();
    this.atCentre = !this.atCentre;
    return this.activeTarget;
  }

  private spawnCentre(): TargetSpawnSpec {
    return {
      id: this.nextTargetId++,
      xAngleUnits: wrapYaw(0),
      yAngleUnits: clampPitch(0),
      radiusAngleUnits: this.radiusUnits,
    };
  }

  private spawnPeripheral(prng: PrngV1): TargetSpawnSpec {
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
      xAngleUnits: wrapYaw(dx),
      yAngleUnits: clampPitch(dy),
      radiusAngleUnits: this.radiusUnits,
    };
  }
}
