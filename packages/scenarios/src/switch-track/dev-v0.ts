import {
  createAngleUnits,
  shortestSignedAngleDelta,
  type PrngV1,
  wrapYaw,
} from "@findmysensi/aim-core";
import {
  MEDIUM_SPAWN_HALF_HEIGHT_UNITS,
  MEDIUM_SPAWN_HALF_WIDTH_UNITS,
} from "../front-facing-area.js";
import { defaultScenarioRegistry } from "../registry.js";
import type {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

/**
 * Switch Track: four moving targets, all alive at once. Damage accumulates
 * into whichever target the crosshair is on; once a target has taken enough,
 * it dies and is replaced, and the player must find and settle onto another.
 *
 * Two skills are measured together -- how cleanly you hold a moving target,
 * and how fast you transition to the next one.
 *
 * NOTE ON FIRING: the spec calls for damage only while the left button is
 * held. The deterministic input pipeline currently carries discrete MOVE and
 * SHOT events with no held-button state (mouseup is bound only to suppress
 * browser gestures), so damage here accrues from crosshair overlap alone.
 * Gating it on a real fire-state needs a new event kind plumbed through the
 * ring buffer, reducer, adapter interface and run controller.
 */

/** Spec: roughly 400 ms of clean contact kills a target, at 128 Hz. */
export const SWITCH_TRACK_TTK_TICKS = 51;
export const SWITCH_TRACK_ACTIVE_TARGETS = 4;

/** Spec: 2.6 deg diameter, so a 1.3 deg radius. */
export const SWITCH_TRACK_RADIUS_UNITS = 60_584;
/** Targets roam inside the shared medium front-facing envelope. */
export const SWITCH_TRACK_HALF_WIDTH_UNITS = MEDIUM_SPAWN_HALF_WIDTH_UNITS;
export const SWITCH_TRACK_HALF_HEIGHT_UNITS = MEDIUM_SPAWN_HALF_HEIGHT_UNITS;

/** Spec: 8-18 deg/sec per target. */
const SWITCH_TRACK_MIN_SPEED = 2_913;
const SWITCH_TRACK_MAX_SPEED = 6_553;
/** Spec: each target changes heading every 0.8-2.0 s. */
const SWITCH_TRACK_MIN_HEADING_TICKS = 102;
const SWITCH_TRACK_MAX_HEADING_TICKS = 256;

export const SWITCH_TRACK_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "switch-track",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: SWITCH_TRACK_ACTIVE_TARGETS,
    targetRadiusAngleUnits: SWITCH_TRACK_RADIUS_UNITS,
    spawnAreaWidthUnits: SWITCH_TRACK_HALF_WIDTH_UNITS * 2,
    spawnAreaHeightUnits: SWITCH_TRACK_HALF_HEIGHT_UNITS * 2,
    minTargetSeparationUnits: 300_000,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const SWITCH_TRACK_DEV_V0_ENTRY: ScenarioEntry = {
  definition: SWITCH_TRACK_DEV_V0_DEFINITION,
  presentation: {
    title: "Switch Track",
    subtitle: "Track, Kill, Reacquire",
    description:
      "Track one moving target until it is eliminated, then snap quickly to another and continue. Four targets are alive at all times.",
    category: "switching",
    thumbnailUrl: "/thumbnails/switch-track.webp",
    tags: ["switching", "tracking", "acquisition", "ttk", "practice"],
  },
};

defaultScenarioRegistry.register(SWITCH_TRACK_DEV_V0_ENTRY);

export interface SwitchTrackTickResult {
  /** Distance from the crosshair to the nearest target. */
  readonly errorUnits: number;
  readonly onTarget: boolean;
  /** Ticks from the engaged target's spawn to first contact, once only. */
  readonly acquisitionTicks: number | null;
  /** True on the tick a target died. */
  readonly killed: boolean;
  /** Ticks between the previous kill and first contact with the next target. */
  readonly switchTicks: number | null;
}

interface LiveTarget {
  readonly id: number;
  x: number;
  y: number;
  yawVelocity: number;
  pitchVelocity: number;
  nextHeadingTick: number;
  readonly spawnTick: number;
  damageTicks: number;
  contacted: boolean;
}

export class SwitchTrackScenarioEngine {
  private readonly radiusUnits: number;
  private readonly halfWidth: number;
  private readonly halfHeight: number;
  private readonly minSeparation: number;
  private live: LiveTarget[] = [];
  private nextTargetId = 1;
  private engagedId: number | null = null;
  private lastKillTick: number | null = null;

  constructor(
    definition: RankedScenarioDefinition = SWITCH_TRACK_DEV_V0_DEFINITION,
  ) {
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.halfWidth = Math.floor(definition.simulation.spawnAreaWidthUnits / 2);
    this.halfHeight = Math.floor(
      definition.simulation.spawnAreaHeightUnits / 2,
    );
    this.minSeparation = definition.simulation.minTargetSeparationUnits;
  }

  public initialize(prng: PrngV1): readonly TargetSpawnSpec[] {
    this.live = [];
    this.nextTargetId = 1;
    this.engagedId = null;
    this.lastKillTick = null;
    for (let i = 0; i < SWITCH_TRACK_ACTIVE_TARGETS; i++) {
      this.spawn(prng, 0);
    }
    return this.getActiveTargets();
  }

  public tick(
    currentTick: number,
    playerYaw: number,
    playerPitch: number,
    prng: PrngV1,
  ): SwitchTrackTickResult {
    this.moveTargets(currentTick, prng);

    let nearestError = Number.POSITIVE_INFINITY;
    let hovered: LiveTarget | null = null;
    for (const target of this.live) {
      const error = this.errorTo(target, playerYaw, playerPitch);
      if (error < nearestError) nearestError = error;
      if (error <= this.radiusUnits) hovered = target;
    }

    let acquisitionTicks: number | null = null;
    let switchTicks: number | null = null;
    let killed = false;

    if (hovered) {
      if (!hovered.contacted) {
        hovered.contacted = true;
        acquisitionTicks = currentTick - hovered.spawnTick;
        // A switch is only meaningful once something has been killed and the
        // player has settled onto a different target.
        if (this.lastKillTick !== null && this.engagedId !== hovered.id) {
          switchTicks = currentTick - this.lastKillTick;
        }
      }
      this.engagedId = hovered.id;
      hovered.damageTicks++;

      if (hovered.damageTicks >= SWITCH_TRACK_TTK_TICKS) {
        const deadId = hovered.id;
        this.live = this.live.filter((t) => t.id !== deadId);
        this.spawn(prng, currentTick);
        this.lastKillTick = currentTick;
        this.engagedId = null;
        killed = true;
      }
    }

    return {
      errorUnits: Number.isFinite(nearestError) ? nearestError : 0,
      onTarget: hovered !== null,
      acquisitionTicks,
      killed,
      switchTicks,
    };
  }

  public getActiveTargets(): readonly TargetSpawnSpec[] {
    return Object.freeze(
      this.live.map((t) => ({
        id: t.id,
        xAngleUnits: wrapYaw(t.x),
        yAngleUnits: t.y,
        radiusAngleUnits: this.radiusUnits,
      })),
    );
  }

  public getActiveCount(): number {
    return this.live.length;
  }

  private moveTargets(currentTick: number, prng: PrngV1): void {
    for (const target of this.live) {
      if (currentTick >= target.nextHeadingTick) {
        this.chooseHeading(target, currentTick, prng);
      }

      target.x += target.yawVelocity;
      target.y += target.pitchVelocity;

      if (target.x > this.halfWidth || target.x < -this.halfWidth) {
        target.x = Math.max(
          -this.halfWidth,
          Math.min(this.halfWidth, target.x),
        );
        target.yawVelocity = -target.yawVelocity;
      }
      if (target.y > this.halfHeight || target.y < -this.halfHeight) {
        target.y = Math.max(
          -this.halfHeight,
          Math.min(this.halfHeight, target.y),
        );
        target.pitchVelocity = -target.pitchVelocity;
      }
    }
  }

  private errorTo(
    target: LiveTarget,
    playerYaw: number,
    playerPitch: number,
  ): number {
    const dx = shortestSignedAngleDelta(
      createAngleUnits(wrapYaw(target.x)),
      wrapYaw(playerYaw),
    );
    const dy = playerPitch - target.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private chooseHeading(
    target: LiveTarget,
    currentTick: number,
    prng: PrngV1,
  ): void {
    const yawSpeed = prng.nextRange(
      SWITCH_TRACK_MIN_SPEED,
      SWITCH_TRACK_MAX_SPEED + 1,
    );
    const pitchSpeed = prng.nextRange(
      Math.floor(SWITCH_TRACK_MIN_SPEED / 2),
      Math.floor(SWITCH_TRACK_MAX_SPEED / 2) + 1,
    );
    target.yawVelocity = prng.nextRange(0, 2) === 0 ? -yawSpeed : yawSpeed;
    target.pitchVelocity =
      prng.nextRange(0, 2) === 0 ? -pitchSpeed : pitchSpeed;
    target.nextHeadingTick =
      currentTick +
      prng.nextRange(
        SWITCH_TRACK_MIN_HEADING_TICKS,
        SWITCH_TRACK_MAX_HEADING_TICKS + 1,
      );
  }

  private spawn(prng: PrngV1, currentTick: number): LiveTarget {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      x = prng.nextRange(-this.halfWidth, this.halfWidth + 1);
      y = prng.nextRange(-this.halfHeight, this.halfHeight + 1);
      if (!this.tooClose(x, y)) break;
    }

    const target: LiveTarget = {
      id: this.nextTargetId++,
      x,
      y,
      yawVelocity: 0,
      pitchVelocity: 0,
      nextHeadingTick: currentTick,
      spawnTick: currentTick,
      damageTicks: 0,
      contacted: false,
    };
    this.chooseHeading(target, currentTick, prng);
    this.live.push(target);
    return target;
  }

  private tooClose(x: number, y: number): boolean {
    for (const t of this.live) {
      const dx = t.x - x;
      const dy = t.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < this.minSeparation) return true;
    }
    return false;
  }
}
