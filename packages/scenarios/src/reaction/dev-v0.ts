import { type PrngV1, wrapYaw } from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import type {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

/** Reflex Rush spec: a target lives exactly 1.00 s at the 128 Hz sim rate. */
export const REACTION_TARGET_LIFETIME_TICKS = 128;
/** Spec: next target appears 50-100 ms after the previous one resolves. */
export const REACTION_MIN_DELAY_TICKS = 6;
export const REACTION_MAX_DELAY_TICKS = 13;

/** Spec: diameter varies 1.7-2.8 deg, so radius spans 0.85-1.4 deg. */
export const REACTION_MIN_RADIUS_UNITS = 39_613;
export const REACTION_MAX_RADIUS_UNITS = 65_244;

/**
 * Spec: consecutive targets sit at least 12 deg apart, otherwise two spawns
 * in nearly the same place turn into a trivial double-click that measures
 * nothing.
 */
export const REACTION_MIN_SEPARATION_UNITS = 559_241;

export const REACTION_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "reaction",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  // Nominal radius is the midpoint of the 1.7-2.8 deg band; each spawned
  // target picks its own radius inside that band at run time.
  simulation: {
    maxActiveTargets: 1,
    targetRadiusAngleUnits: 52_429,
    spawnAreaWidthUnits: 3_914_684,
    spawnAreaHeightUnits: 2_516_582,
    minTargetSeparationUnits: REACTION_MIN_SEPARATION_UNITS,
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
    title: "Reflex Rush",
    subtitle: "Reaction and Acquisition",
    description:
      "A target appears unexpectedly anywhere in your view. React and hit it before time expires.",
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
  private readonly areaWidth: number;
  private readonly areaHeight: number;
  private readonly minSeparation: number;
  private activeTarget: TargetSpawnSpec | null = null;
  private nextSpawnTick = 0;
  private nextTargetId = 1;
  private lastX: number | null = null;
  private lastY: number | null = null;

  constructor(
    definition: RankedScenarioDefinition = REACTION_DEV_V0_DEFINITION,
  ) {
    this.areaWidth = definition.simulation.spawnAreaWidthUnits;
    this.areaHeight = definition.simulation.spawnAreaHeightUnits;
    this.minSeparation = definition.simulation.minTargetSeparationUnits;
  }

  public initialize(prng: PrngV1, currentTick = 0): void {
    this.activeTarget = null;
    this.nextTargetId = 1;
    this.lastX = null;
    this.lastY = null;
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

    // Reject positions too close to the previous target so the player has to
    // actually re-acquire rather than click twice in the same spot. Bounded
    // retries keep this deterministic and non-blocking; if the area is too
    // tight to satisfy the constraint we accept the last candidate rather
    // than looping forever.
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 32; attempt++) {
      x = prng.nextRange(-halfW, halfW + 1);
      y = prng.nextRange(-halfH, halfH + 1);
      if (this.lastX === null || this.lastY === null) break;
      const dx = x - this.lastX;
      const dy = y - this.lastY;
      if (Math.sqrt(dx * dx + dy * dy) >= this.minSeparation) break;
    }
    this.lastX = x;
    this.lastY = y;

    return {
      id: this.nextTargetId++,
      xAngleUnits: wrapYaw(x),
      yAngleUnits: y,
      radiusAngleUnits: prng.nextRange(
        REACTION_MIN_RADIUS_UNITS,
        REACTION_MAX_RADIUS_UNITS + 1,
      ),
      lifetimeTicks: currentTick + REACTION_TARGET_LIFETIME_TICKS,
    };
  }
}
