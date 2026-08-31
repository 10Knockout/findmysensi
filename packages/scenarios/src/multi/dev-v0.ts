import { PrngV1 } from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

/**
 * Multi: Release-fixed large/medium/small opportunity quotas.
 * Multiple targets of varying sizes spawn with rapid respawns.
 * Tests fast target switching and acquisition under pressure.
 */

export type TargetSize = "large" | "medium" | "small";

export interface MultiTargetSpawnSpec extends TargetSpawnSpec {
  readonly size: TargetSize;
}

const SIZE_RADIUS: Record<TargetSize, number> = {
  large: 40000, // ~0.86 deg
  medium: 25000, // ~0.54 deg
  small: 15000, // ~0.32 deg
};

/** Quota per 60-second round: how many of each size appear total */
const SIZE_QUOTA: Record<TargetSize, number> = {
  large: 20,
  medium: 30,
  small: 10,
};

export const MULTI_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "multi",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: 5,
    targetRadiusAngleUnits: 25000, // nominal — actual varies by size
    spawnAreaWidthUnits: 1400000,
    spawnAreaHeightUnits: 800000,
    minTargetSeparationUnits: 100000,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const MULTI_DEV_V0_ENTRY: ScenarioEntry = {
  definition: MULTI_DEV_V0_DEFINITION,
  presentation: {
    title: "Multi (Dev v0)",
    subtitle: "5-Target Mixed-Size Switching",
    description:
      "Large, medium, and small targets spawn with rapid respawns. Tests fast target acquisition and switching.",
    category: "switching",
    thumbnailUrl: "/thumbnails/multi.webp",
    tags: ["multi", "switching", "speed", "mixed", "practice"],
  },
};

defaultScenarioRegistry.register(MULTI_DEV_V0_ENTRY);

export class MultiScenarioEngine {
  private readonly maxActive: number;
  private readonly areaWidth: number;
  private readonly areaHeight: number;
  private readonly minSep: number;
  private activeTargets: MultiTargetSpawnSpec[] = [];
  private nextTargetId: number = 1;
  private sizeQueue: TargetSize[] = [];

  constructor(definition: RankedScenarioDefinition = MULTI_DEV_V0_DEFINITION) {
    this.maxActive = definition.simulation.maxActiveTargets;
    this.areaWidth = definition.simulation.spawnAreaWidthUnits;
    this.areaHeight = definition.simulation.spawnAreaHeightUnits;
    this.minSep = definition.simulation.minTargetSeparationUnits;
  }

  /**
   * Build a shuffled queue of target sizes from quota.
   */
  private buildSizeQueue(prng: PrngV1): TargetSize[] {
    const queue: TargetSize[] = [];
    for (const [size, count] of Object.entries(SIZE_QUOTA)) {
      for (let i = 0; i < count; i++) {
        queue.push(size as TargetSize);
      }
    }
    // Fisher-Yates shuffle with deterministic PRNG
    for (let i = queue.length - 1; i > 0; i--) {
      const j = prng.nextRange(0, i + 1);
      [queue[i], queue[j]] = [queue[j]!, queue[i]!];
    }
    return queue;
  }

  public initialize(prng: PrngV1): readonly MultiTargetSpawnSpec[] {
    this.activeTargets = [];
    this.nextTargetId = 1;
    this.sizeQueue = this.buildSizeQueue(prng);

    for (let i = 0; i < this.maxActive && this.sizeQueue.length > 0; i++) {
      this.spawnTarget(prng);
    }

    return this.getActiveTargets();
  }

  public getActiveTargets(): readonly MultiTargetSpawnSpec[] {
    return Object.freeze([...this.activeTargets]);
  }

  public onTargetHit(
    targetId: number,
    prng: PrngV1,
  ): MultiTargetSpawnSpec | null {
    const hitIdx = this.activeTargets.findIndex((t) => t.id === targetId);
    if (hitIdx === -1) return null;

    this.activeTargets.splice(hitIdx, 1);

    if (this.sizeQueue.length > 0) {
      return this.spawnTarget(prng);
    }
    return null;
  }

  public getRemainingQuota(): number {
    return this.sizeQueue.length;
  }

  private spawnTarget(prng: PrngV1): MultiTargetSpawnSpec {
    const size = this.sizeQueue.shift() ?? "medium";
    const radius = SIZE_RADIUS[size];

    const halfW = Math.floor(this.areaWidth / 2);
    const halfH = Math.floor(this.areaHeight / 2);

    let x: number;
    let y: number;
    let attempts = 0;
    do {
      x = prng.nextRange(-halfW, halfW + 1);
      y = prng.nextRange(-halfH, halfH + 1);
      attempts++;
    } while (attempts < 100 && this.tooClose(x, y));

    const newTarget: MultiTargetSpawnSpec = {
      id: this.nextTargetId++,
      xAngleUnits: x,
      yAngleUnits: y,
      radiusAngleUnits: radius,
      size,
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
