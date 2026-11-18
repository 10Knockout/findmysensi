import {
  degreesToAngleDeltaUnits,
  wrapYaw,
  type PrngV1,
} from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import type { ScenarioEntry, TargetSpawnSpec } from "../types.js";

export const PATHLINE_MODE_ID = "pathline" as const;
export const PATHLINE_CORRIDOR_RADIUS = degreesToAngleDeltaUnits(1.25);
const TARGET_RADIUS = degreesToAngleDeltaUnits(0.9);
const HORIZONTAL_STEP = degreesToAngleDeltaUnits(9);
const VERTICAL_STEP = degreesToAngleDeltaUnits(4);
const MIN_SEPARATION = degreesToAngleDeltaUnits(7);
const MAX_SEPARATION = degreesToAngleDeltaUnits(18);

export const PATHLINE_DEV_V0_ENTRY: ScenarioEntry = {
  definition: {
    modeId: PATHLINE_MODE_ID,
    scenarioVersion: 0,
    engineVersion: 1,
    scoringVersion: 0,
    durationTicks: 128 * 60,
    simulation: {
      maxActiveTargets: 1,
      targetRadiusAngleUnits: TARGET_RADIUS,
      spawnAreaWidthUnits: 2 * HORIZONTAL_STEP,
      spawnAreaHeightUnits: 2 * VERTICAL_STEP,
      minTargetSeparationUnits: MIN_SEPARATION,
    },
    rankedSettings: {
      rankedEnabled: false,
      strictInputHealth: false,
      maxLagViolationTicks: 128,
    },
  },
  presentation: {
    title: "Pathline",
    subtitle: "Precision Path Practice",
    description:
      "Shoot the first orb, follow the corridor to the next orb, and shoot again. Staying inside earns full points.",
    category: "precision",
    thumbnailUrl: "/thumbnails/pinpoint.webp",
    tags: ["pathline", "precision", "practice"],
  },
};

defaultScenarioRegistry.register(PATHLINE_DEV_V0_ENTRY);

const SLOTS = [-1, 0, 1].flatMap((column) =>
  [-1, 0, 1].map((row) => ({
    x: column * HORIZONTAL_STEP,
    y: row * VERTICAL_STEP,
  })),
);
const START_SLOT = 4;

export class PathlineScenario {
  private slot = START_SLOT;
  private nextId = 1;

  public reset(): TargetSpawnSpec {
    this.slot = START_SLOT;
    this.nextId = 1;
    return this.target();
  }

  public next(prng: PrngV1): TargetSpawnSpec {
    const current = SLOTS[this.slot]!;
    const candidates = SLOTS.flatMap((candidate, index) => {
      const dx = candidate.x - current.x;
      const dy = candidate.y - current.y;
      const distanceSquared = dx * dx + dy * dy;
      return distanceSquared >= MIN_SEPARATION ** 2 &&
        distanceSquared <= MAX_SEPARATION ** 2
        ? [index]
        : [];
    });
    this.slot = candidates[prng.nextRange(0, candidates.length)]!;
    return this.target();
  }

  private target(): TargetSpawnSpec {
    const { x, y } = SLOTS[this.slot]!;
    return {
      id: this.nextId++,
      xAngleUnits: wrapYaw(x),
      yAngleUnits: y,
      radiusAngleUnits: TARGET_RADIUS,
    };
  }
}
