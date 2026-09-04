import { FULL_TURN_UNITS, PrngV1, wrapYaw } from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

/**
 * Strafe: Balanced lanes with linear and oscillating moving targets.
 * Targets move horizontally (strafing) at varying speeds, with reversals and stops.
 * Tests tracking ability with unpredictable direction changes.
 */

export type StrafeDirection = "left" | "right";
export type StrafePattern = "linear" | "oscillating";

export interface StrafeTarget extends TargetSpawnSpec {
  readonly direction: StrafeDirection;
  readonly pattern: StrafePattern;
  /** Velocity in angle-units per tick (signed: negative=left, positive=right) */
  readonly velocityUnitsPerTick: number;
  /** For oscillating: half-period in ticks before reversal */
  readonly halfPeriodTicks: number;
  /** Tick when this target was spawned, used for oscillation phase */
  readonly spawnTick: number;
}

const STRAFE_SPEEDS = [800, 1200, 1800, 2400]; // units/tick
const STRAFE_HALF_PERIODS = [64, 96, 128, 192]; // ticks

export const STRAFE_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "strafe",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: 2,
    targetRadiusAngleUnits: 30000, // ~0.64 deg — slightly larger to compensate for movement
    spawnAreaWidthUnits: 1400000,
    spawnAreaHeightUnits: 600000,
    minTargetSeparationUnits: 200000,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const STRAFE_DEV_V0_ENTRY: ScenarioEntry = {
  definition: STRAFE_DEV_V0_DEFINITION,
  presentation: {
    title: "Strafe (Dev v0)",
    subtitle: "Moving Target Tracking Practice",
    description:
      "Targets strafe horizontally with linear and oscillating patterns. Tests tracking with unpredictable reversals.",
    category: "tracking",
    thumbnailUrl: "/thumbnails/strafe.webp",
    tags: ["strafe", "tracking", "moving", "practice"],
  },
};

defaultScenarioRegistry.register(STRAFE_DEV_V0_ENTRY);

export class StrafeScenarioEngine {
  private readonly radiusUnits: number;
  private readonly maxActive: number;
  private readonly areaWidth: number;
  private readonly areaHeight: number;
  private activeTargets: StrafeTarget[] = [];
  private nextTargetId: number = 1;

  constructor(definition: RankedScenarioDefinition = STRAFE_DEV_V0_DEFINITION) {
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.maxActive = definition.simulation.maxActiveTargets;
    this.areaWidth = definition.simulation.spawnAreaWidthUnits;
    this.areaHeight = definition.simulation.spawnAreaHeightUnits;
  }

  public initialize(
    prng: PrngV1,
    currentTick: number = 0,
  ): readonly StrafeTarget[] {
    this.activeTargets = [];
    this.nextTargetId = 1;

    for (let i = 0; i < this.maxActive; i++) {
      this.spawnTarget(prng, currentTick);
    }

    return this.getActiveTargets();
  }

  public getActiveTargets(): readonly StrafeTarget[] {
    return Object.freeze([...this.activeTargets]);
  }

  /**
   * Advance all targets by one tick. Oscillating targets reverse direction
   * at their half-period boundaries. Linear targets bounce off area edges.
   */
  public tick(currentTick: number): void {
    const halfW = Math.floor(this.areaWidth / 2);

    for (let i = 0; i < this.activeTargets.length; i++) {
      const t = this.activeTargets[i]!;
      let newX =
        t.xAngleUnits > FULL_TURN_UNITS / 2
          ? t.xAngleUnits - FULL_TURN_UNITS
          : t.xAngleUnits;
      let velocity = t.velocityUnitsPerTick;

      if (t.pattern === "oscillating") {
        const elapsed = currentTick - t.spawnTick;
        const phase = Math.floor(elapsed / t.halfPeriodTicks);
        // Reverse direction on odd phases
        velocity = phase % 2 === 0 ? Math.abs(velocity) : -Math.abs(velocity);
        if (t.direction === "left") velocity = -velocity;
      }

      newX += velocity;

      // Bounce off boundaries
      if (newX > halfW) {
        newX = halfW - (newX - halfW);
        velocity = -velocity;
      } else if (newX < -halfW) {
        newX = -halfW + (-halfW - newX);
        velocity = -velocity;
      }

      this.activeTargets[i] = {
        ...t,
        xAngleUnits: wrapYaw(newX),
        velocityUnitsPerTick: velocity,
      };
    }
  }

  /**
   * Returns the current position of targets for hit-testing.
   * Note: collision must use the current xAngleUnits after tick().
   */
  public getPositionsForHitTest(): readonly TargetSpawnSpec[] {
    return this.activeTargets.map((t) => ({
      id: t.id,
      xAngleUnits: t.xAngleUnits,
      yAngleUnits: t.yAngleUnits,
      radiusAngleUnits: t.radiusAngleUnits,
    }));
  }

  public onTargetHit(
    targetId: number,
    prng: PrngV1,
    currentTick: number,
  ): StrafeTarget | null {
    const hitIdx = this.activeTargets.findIndex((t) => t.id === targetId);
    if (hitIdx === -1) return null;

    this.activeTargets.splice(hitIdx, 1);
    return this.spawnTarget(prng, currentTick);
  }

  private spawnTarget(prng: PrngV1, currentTick: number): StrafeTarget {
    const halfW = Math.floor(this.areaWidth / 2);
    const halfH = Math.floor(this.areaHeight / 2);

    const x = wrapYaw(prng.nextRange(-halfW, halfW + 1));
    const y = prng.nextRange(-halfH, halfH + 1);

    const direction: StrafeDirection =
      prng.nextRange(0, 2) === 0 ? "left" : "right";
    const pattern: StrafePattern =
      prng.nextRange(0, 2) === 0 ? "linear" : "oscillating";
    const speedIdx = prng.nextRange(0, STRAFE_SPEEDS.length);
    const speed = STRAFE_SPEEDS[speedIdx]!;
    const periodIdx = prng.nextRange(0, STRAFE_HALF_PERIODS.length);
    const halfPeriod = STRAFE_HALF_PERIODS[periodIdx]!;

    const velocity = direction === "right" ? speed : -speed;

    const newTarget: StrafeTarget = {
      id: this.nextTargetId++,
      xAngleUnits: x,
      yAngleUnits: y,
      radiusAngleUnits: this.radiusUnits,
      direction,
      pattern,
      velocityUnitsPerTick: velocity,
      halfPeriodTicks: halfPeriod,
      spawnTick: currentTick,
    };

    this.activeTargets.push(newTarget);
    return newTarget;
  }
}
