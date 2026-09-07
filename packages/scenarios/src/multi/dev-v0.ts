import { PrngV1, wrapYaw } from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

/**
 * Multi Burst: targets keep arriving across the arena, each one growing to
 * full size then shrinking away. A target that is never destroyed expires,
 * so the exercise is about prioritising under pressure -- take the easy
 * fresh target now, or rescue the one that is nearly gone?
 */

/** 1 deg == 46_603 angle units at 2^24 units per full turn. */
/** Spec: initial diameter 2.0 deg. */
export const MULTI_SPAWN_RADIUS_UNITS = 46_603;
/** Spec: peak diameter 3.6 deg. */
export const MULTI_PEAK_RADIUS_UNITS = 83_886;

/** Spec: a target lives 3.0 s at the 128 Hz simulation rate. */
export const MULTI_LIFETIME_TICKS = 384;
/** Spec: grows from spawn size to peak over the first 0.3 s. */
export const MULTI_GROW_END_TICKS = 38;
/** Spec: holds peak size until 1.4 s, then shrinks to nothing by 3.0 s. */
export const MULTI_HOLD_END_TICKS = 179;

/** Spec: start at three targets and build towards six. */
export const MULTI_MIN_ACTIVE_TARGETS = 3;
export const MULTI_MAX_ACTIVE_TARGETS = 6;

/** Spec: an extra target joins every 450-650 ms until the arena is full. */
export const MULTI_MIN_SPAWN_INTERVAL_TICKS = 58;
export const MULTI_MAX_SPAWN_INTERVAL_TICKS = 83;

export interface MultiTargetSpawnSpec extends TargetSpawnSpec {
  /** Simulation tick this target appeared, used to derive its current size. */
  readonly spawnTick: number;
}

export interface MultiTickResult {
  readonly spawned: readonly MultiTargetSpawnSpec[];
  readonly expired: readonly MultiTargetSpawnSpec[];
}

/**
 * Size of a target given how long it has been alive: grow, hold, shrink.
 * Returns 0 once the target has outlived its window, which is what the tick
 * loop treats as expiry.
 */
export function multiRadiusForAge(ageTicks: number): number {
  if (ageTicks < 0 || ageTicks >= MULTI_LIFETIME_TICKS) return 0;

  if (ageTicks < MULTI_GROW_END_TICKS) {
    const span = MULTI_PEAK_RADIUS_UNITS - MULTI_SPAWN_RADIUS_UNITS;
    return (
      MULTI_SPAWN_RADIUS_UNITS +
      Math.floor((span * ageTicks) / MULTI_GROW_END_TICKS)
    );
  }

  if (ageTicks < MULTI_HOLD_END_TICKS) return MULTI_PEAK_RADIUS_UNITS;

  const shrinkTicks = MULTI_LIFETIME_TICKS - MULTI_HOLD_END_TICKS;
  const shrunk = ageTicks - MULTI_HOLD_END_TICKS;
  return (
    MULTI_PEAK_RADIUS_UNITS -
    Math.floor((MULTI_PEAK_RADIUS_UNITS * shrunk) / shrinkTicks)
  );
}

export const MULTI_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "multi",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  // Nominal radius is the peak size; the live radius is derived per tick.
  simulation: {
    maxActiveTargets: MULTI_MAX_ACTIVE_TARGETS,
    targetRadiusAngleUnits: MULTI_PEAK_RADIUS_UNITS,
    spawnAreaWidthUnits: 3_914_684,
    spawnAreaHeightUnits: 2_516_582,
    minTargetSeparationUnits: 200_000,
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
    title: "Multi Burst",
    subtitle: "Prioritisation Under Pressure",
    description:
      "Targets keep appearing across the arena, growing then shrinking away. Destroy them before they expire and overwhelm the screen.",
    category: "switching",
    thumbnailUrl: "/thumbnails/multi.webp",
    tags: ["multi", "switching", "pressure", "prioritisation", "practice"],
  },
};

defaultScenarioRegistry.register(MULTI_DEV_V0_ENTRY);

interface LiveTarget {
  readonly id: number;
  readonly xAngleUnits: number;
  readonly yAngleUnits: number;
  readonly spawnTick: number;
}

export class MultiScenarioEngine {
  private readonly maxActive: number;
  private readonly areaWidth: number;
  private readonly areaHeight: number;
  private readonly minSep: number;
  private live: LiveTarget[] = [];
  private nextTargetId = 1;
  private nextSpawnTick = 0;
  private currentTick = 0;

  constructor(definition: RankedScenarioDefinition = MULTI_DEV_V0_DEFINITION) {
    this.maxActive = definition.simulation.maxActiveTargets;
    this.areaWidth = definition.simulation.spawnAreaWidthUnits;
    this.areaHeight = definition.simulation.spawnAreaHeightUnits;
    this.minSep = definition.simulation.minTargetSeparationUnits;
  }

  public initialize(prng: PrngV1): readonly MultiTargetSpawnSpec[] {
    this.live = [];
    this.nextTargetId = 1;
    this.currentTick = 0;
    for (let i = 0; i < MULTI_MIN_ACTIVE_TARGETS; i++) {
      this.spawnTarget(0, prng);
    }
    this.scheduleNextSpawn(0, prng);
    return this.getActiveTargets();
  }

  /**
   * Advances the arena: expires anything that has outlived its window and
   * lets the population grow towards the maximum.
   */
  public tick(currentTick: number, prng: PrngV1): MultiTickResult {
    this.currentTick = currentTick;

    const expired: MultiTargetSpawnSpec[] = [];
    const survivors: LiveTarget[] = [];
    for (const target of this.live) {
      if (currentTick - target.spawnTick >= MULTI_LIFETIME_TICKS) {
        expired.push(this.toSpec(target, currentTick));
      } else {
        survivors.push(target);
      }
    }
    this.live = survivors;

    const spawned: MultiTargetSpawnSpec[] = [];
    // Never let the arena fall below the floor, and otherwise trickle new
    // targets in on the spawn cadence until it is full.
    while (this.live.length < MULTI_MIN_ACTIVE_TARGETS) {
      spawned.push(this.spawnTarget(currentTick, prng));
    }
    if (
      this.live.length < this.maxActive &&
      currentTick >= this.nextSpawnTick
    ) {
      spawned.push(this.spawnTarget(currentTick, prng));
      this.scheduleNextSpawn(currentTick, prng);
    }

    return { spawned, expired };
  }

  public getActiveTargets(): readonly MultiTargetSpawnSpec[] {
    return Object.freeze(
      this.live.map((target) => this.toSpec(target, this.currentTick)),
    );
  }

  public onTargetHit(
    targetId: number,
    prng: PrngV1,
  ): MultiTargetSpawnSpec | null {
    const hitIdx = this.live.findIndex((t) => t.id === targetId);
    if (hitIdx === -1) return null;
    this.live.splice(hitIdx, 1);

    if (this.live.length < MULTI_MIN_ACTIVE_TARGETS) {
      return this.spawnTarget(this.currentTick, prng);
    }
    return null;
  }

  public getActiveCount(): number {
    return this.live.length;
  }

  private toSpec(target: LiveTarget, atTick: number): MultiTargetSpawnSpec {
    return {
      id: target.id,
      xAngleUnits: target.xAngleUnits,
      yAngleUnits: target.yAngleUnits,
      radiusAngleUnits: multiRadiusForAge(atTick - target.spawnTick),
      spawnTick: target.spawnTick,
      lifetimeTicks: target.spawnTick + MULTI_LIFETIME_TICKS,
    };
  }

  private scheduleNextSpawn(currentTick: number, prng: PrngV1): void {
    this.nextSpawnTick =
      currentTick +
      prng.nextRange(
        MULTI_MIN_SPAWN_INTERVAL_TICKS,
        MULTI_MAX_SPAWN_INTERVAL_TICKS + 1,
      );
  }

  private spawnTarget(currentTick: number, prng: PrngV1): MultiTargetSpawnSpec {
    const halfW = Math.floor(this.areaWidth / 2);
    const halfH = Math.floor(this.areaHeight / 2);

    let x = 0;
    let y = 0;
    let attempts = 0;
    do {
      // Wrap immediately so the separation check compares like with like:
      // every stored target's yaw is already in [0, FULL_TURN_UNITS).
      x = wrapYaw(prng.nextRange(-halfW, halfW + 1));
      y = prng.nextRange(-halfH, halfH + 1);
      attempts++;
    } while (attempts < 100 && this.tooClose(x, y));

    const target: LiveTarget = {
      id: this.nextTargetId++,
      xAngleUnits: x,
      yAngleUnits: y,
      spawnTick: currentTick,
    };
    this.live.push(target);
    return this.toSpec(target, currentTick);
  }

  private tooClose(x: number, y: number): boolean {
    for (const t of this.live) {
      const dx = t.xAngleUnits - x;
      const dy = t.yAngleUnits - y;
      if (Math.sqrt(dx * dx + dy * dy) < this.minSep) return true;
    }
    return false;
  }
}
