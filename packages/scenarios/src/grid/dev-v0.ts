import { PrngV1 } from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

export interface GridSlot {
  readonly index: number;
  readonly row: number;
  readonly col: number;
  readonly xAngleUnits: number;
  readonly yAngleUnits: number;
}

export interface GridDevV0State {
  readonly slots: readonly GridSlot[];
  readonly activeTargets: readonly TargetSpawnSpec[];
  readonly lastHitSlotIndex: number | null;
  readonly nextTargetId: number;
}

export const GRID_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "grid",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60, // 60 seconds at 128 Hz
  simulation: {
    maxActiveTargets: 3,
    targetRadiusAngleUnits: 25000,
    spawnAreaWidthUnits: 1200000, // ~25.7 deg horizontal
    spawnAreaHeightUnits: 720000, // ~15.4 deg vertical
    minTargetSeparationUnits: 120000,
    gridRows: 5,
    gridCols: 5,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const GRID_DEV_V0_ENTRY: ScenarioEntry = {
  definition: GRID_DEV_V0_DEFINITION,
  presentation: {
    title: "Grid Shot (Dev v0)",
    subtitle: "3-Target Static Flick Practice",
    description:
      "Practice clicking three static targets that regenerate upon being hit.",
    category: "flick",
    thumbnailUrl: "/thumbnails/grid.webp",
    tags: ["grid", "flick", "speed", "practice"],
  },
};

defaultScenarioRegistry.register(GRID_DEV_V0_ENTRY);

export function generateGridSlots(
  rows: number = 5,
  cols: number = 5,
  widthUnits: number = 1200000,
  heightUnits: number = 720000,
): readonly GridSlot[] {
  const slots: GridSlot[] = [];
  const startX = -Math.floor(widthUnits / 2);
  const startY = -Math.floor(heightUnits / 2);

  const stepX = cols > 1 ? Math.floor(widthUnits / (cols - 1)) : 0;
  const stepY = rows > 1 ? Math.floor(heightUnits / (rows - 1)) : 0;

  let index = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({
        index: index++,
        row: r,
        col: c,
        xAngleUnits: startX + c * stepX,
        yAngleUnits: startY + r * stepY,
      });
    }
  }

  return Object.freeze(slots);
}

export class GridScenarioEngine {
  private readonly slots: readonly GridSlot[];
  private readonly radiusUnits: number;
  private readonly maxActive: number;
  private activeTargets: TargetSpawnSpec[] = [];
  private activeSlotIndices: Set<number> = new Set();
  private lastHitSlotIndex: number | null = null;
  private nextTargetId: number = 1;

  constructor(definition: RankedScenarioDefinition = GRID_DEV_V0_DEFINITION) {
    const rows = definition.simulation.gridRows ?? 5;
    const cols = definition.simulation.gridCols ?? 5;
    this.slots = generateGridSlots(
      rows,
      cols,
      definition.simulation.spawnAreaWidthUnits,
      definition.simulation.spawnAreaHeightUnits,
    );
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.maxActive = definition.simulation.maxActiveTargets;
  }

  public initialize(prng: PrngV1): readonly TargetSpawnSpec[] {
    this.activeTargets = [];
    this.activeSlotIndices.clear();
    this.lastHitSlotIndex = null;
    this.nextTargetId = 1;

    for (let i = 0; i < this.maxActive; i++) {
      this.spawnNewTarget(prng);
    }

    return this.getActiveTargets();
  }

  public getActiveTargets(): readonly TargetSpawnSpec[] {
    return Object.freeze([...this.activeTargets]);
  }

  public onTargetHit(targetId: number, prng: PrngV1): TargetSpawnSpec | null {
    const hitIdx = this.activeTargets.findIndex((t) => t.id === targetId);
    if (hitIdx === -1) {
      return null;
    }

    const hitTarget = this.activeTargets[hitIdx]!;
    // Find which slot was hit
    const slot = this.slots.find(
      (s) =>
        s.xAngleUnits === hitTarget.xAngleUnits &&
        s.yAngleUnits === hitTarget.yAngleUnits,
    );

    if (slot) {
      this.activeSlotIndices.delete(slot.index);
      this.lastHitSlotIndex = slot.index;
    }

    // Remove hit target
    this.activeTargets.splice(hitIdx, 1);

    // Spawn replacement
    return this.spawnNewTarget(prng);
  }

  private spawnNewTarget(prng: PrngV1): TargetSpawnSpec {
    // Available candidate slots: not currently active, and not the last hit slot
    const candidates = this.slots.filter(
      (s) =>
        !this.activeSlotIndices.has(s.index) &&
        (this.lastHitSlotIndex === null || s.index !== this.lastHitSlotIndex),
    );

    if (candidates.length === 0) {
      throw new Error("No candidate slots available for grid target spawn.");
    }

    const chosenIdx = prng.nextRange(0, candidates.length);
    const chosenSlot = candidates[chosenIdx]!;

    const newTarget: TargetSpawnSpec = {
      id: this.nextTargetId++,
      xAngleUnits: chosenSlot.xAngleUnits,
      yAngleUnits: chosenSlot.yAngleUnits,
      radiusAngleUnits: this.radiusUnits,
    };

    this.activeTargets.push(newTarget);
    this.activeSlotIndices.add(chosenSlot.index);

    return newTarget;
  }
}
