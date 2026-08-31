import { PrngV1 } from "@findmysensi/aim-core";
import { defaultScenarioRegistry } from "../registry.js";
import {
  RankedScenarioDefinition,
  ScenarioEntry,
  TargetSpawnSpec,
} from "../types.js";

/**
 * Tempo: Rhythmic click timing scenario.
 * Targets appear at a fixed BPM cadence. Player must click within a timing
 * window around the beat. Measures rhythmic accuracy and reaction consistency.
 *
 * Like a rhythm game overlay for aim training — tests both timing and accuracy.
 */

export interface TempoTarget extends TargetSpawnSpec {
  /** The tick at which this target becomes active (beat tick) */
  readonly beatTick: number;
  /** Early window: player can click this many ticks before beatTick */
  readonly earlyWindowTicks: number;
  /** Late window: player can click this many ticks after beatTick */
  readonly lateWindowTicks: number;
}

export type TempoJudgement = "perfect" | "early" | "late" | "miss";

/** BPM schedule: tick intervals between beats */
const TEMPO_BPM = 120;
const TICKS_PER_MINUTE = 128 * 60;
const TICKS_PER_BEAT = Math.round(TICKS_PER_MINUTE / TEMPO_BPM);

/** Timing windows (in ticks at 128 Hz) */
const PERFECT_WINDOW = 8; // ±62.5ms
const EARLY_WINDOW = 20; // 156.25ms before beat
const LATE_WINDOW = 20; // 156.25ms after beat

export const TEMPO_DEV_V0_DEFINITION: RankedScenarioDefinition = {
  modeId: "tempo",
  scenarioVersion: 0,
  engineVersion: 1,
  scoringVersion: 0,
  durationTicks: 128 * 60,
  simulation: {
    maxActiveTargets: 1,
    targetRadiusAngleUnits: 30000, // generous — timing is the challenge, not precision
    spawnAreaWidthUnits: 1200000,
    spawnAreaHeightUnits: 700000,
    minTargetSeparationUnits: 150000,
  },
  rankedSettings: {
    rankedEnabled: false,
    strictInputHealth: false,
    maxLagViolationTicks: 128,
  },
};

export const TEMPO_DEV_V0_ENTRY: ScenarioEntry = {
  definition: TEMPO_DEV_V0_DEFINITION,
  presentation: {
    title: "Tempo (Dev v0)",
    subtitle: "Rhythmic Click Timing",
    description:
      "Targets appear on a 120 BPM beat. Click within the timing window for Perfect/Early/Late judgements.",
    category: "precision",
    thumbnailUrl: "/thumbnails/tempo.webp",
    tags: ["tempo", "rhythm", "timing", "precision", "practice"],
  },
};

defaultScenarioRegistry.register(TEMPO_DEV_V0_ENTRY);

export class TempoScenarioEngine {
  private readonly radiusUnits: number;
  private readonly areaWidth: number;
  private readonly areaHeight: number;
  private readonly minSep: number;
  private readonly durationTicks: number;

  private beatSchedule: TempoTarget[] = [];
  private currentBeatIndex: number = 0;
  private activeTarget: TempoTarget | null = null;
  private nextTargetId: number = 1;
  private lastX: number | null = null;
  private lastY: number | null = null;

  /** Judgement log for scoring */
  private judgements: TempoJudgement[] = [];

  constructor(definition: RankedScenarioDefinition = TEMPO_DEV_V0_DEFINITION) {
    this.radiusUnits = definition.simulation.targetRadiusAngleUnits;
    this.areaWidth = definition.simulation.spawnAreaWidthUnits;
    this.areaHeight = definition.simulation.spawnAreaHeightUnits;
    this.minSep = definition.simulation.minTargetSeparationUnits;
    this.durationTicks = definition.durationTicks;
  }

  /**
   * Pre-generate the full beat schedule deterministically.
   */
  public initialize(prng: PrngV1): TempoTarget | null {
    this.beatSchedule = [];
    this.currentBeatIndex = 0;
    this.activeTarget = null;
    this.nextTargetId = 1;
    this.lastX = null;
    this.lastY = null;
    this.judgements = [];

    const halfW = Math.floor(this.areaWidth / 2);
    const halfH = Math.floor(this.areaHeight / 2);

    // Generate beats across the duration
    for (
      let beatTick = TICKS_PER_BEAT;
      beatTick < this.durationTicks;
      beatTick += TICKS_PER_BEAT
    ) {
      let x: number;
      let y: number;
      let attempts = 0;
      do {
        x = prng.nextRange(-halfW, halfW + 1);
        y = prng.nextRange(-halfH, halfH + 1);
        attempts++;
      } while (
        attempts < 100 &&
        this.lastX !== null &&
        this.lastY !== null &&
        Math.sqrt(
          (x - this.lastX) * (x - this.lastX) +
            (y - this.lastY) * (y - this.lastY),
        ) < this.minSep
      );

      this.lastX = x;
      this.lastY = y;

      this.beatSchedule.push({
        id: this.nextTargetId++,
        xAngleUnits: x,
        yAngleUnits: y,
        radiusAngleUnits: this.radiusUnits,
        beatTick,
        earlyWindowTicks: EARLY_WINDOW,
        lateWindowTicks: LATE_WINDOW,
      });
    }

    return this.advanceToNextBeat();
  }

  /**
   * Called each tick. Manages beat activation and expiration.
   */
  public tick(currentTick: number): TempoTarget | null {
    if (this.activeTarget) {
      // Check if late window has expired → miss
      const deadline =
        this.activeTarget.beatTick + this.activeTarget.lateWindowTicks;
      if (currentTick > deadline) {
        this.judgements.push("miss");
        this.activeTarget = null;
        return this.advanceToNextBeat();
      }
    }

    // Check if next beat should activate (show target in early window)
    if (
      !this.activeTarget &&
      this.currentBeatIndex < this.beatSchedule.length
    ) {
      const nextBeat = this.beatSchedule[this.currentBeatIndex]!;
      const showTick = nextBeat.beatTick - nextBeat.earlyWindowTicks;
      if (currentTick >= showTick) {
        this.activeTarget = nextBeat;
        this.currentBeatIndex++;
      }
    }

    return this.activeTarget;
  }

  /**
   * Process a shot. Returns the timing judgement.
   */
  public processShot(
    currentTick: number,
    _hitTargetId: number | null,
  ): TempoJudgement {
    if (!this.activeTarget || _hitTargetId !== this.activeTarget.id) {
      return "miss";
    }

    const delta = currentTick - this.activeTarget.beatTick;
    let judgement: TempoJudgement;

    if (Math.abs(delta) <= PERFECT_WINDOW) {
      judgement = "perfect";
    } else if (delta < 0) {
      judgement = "early";
    } else {
      judgement = "late";
    }

    this.judgements.push(judgement);
    this.activeTarget = null;
    return judgement;
  }

  public getActiveTarget(): TempoTarget | null {
    return this.activeTarget;
  }

  public getJudgements(): readonly TempoJudgement[] {
    return Object.freeze([...this.judgements]);
  }

  public getTempoMetrics(): {
    perfect: number;
    early: number;
    late: number;
    miss: number;
    totalBeats: number;
    perfectPercentage: number;
  } {
    const counts = { perfect: 0, early: 0, late: 0, miss: 0 };
    for (const j of this.judgements) {
      counts[j]++;
    }
    const total = this.judgements.length;
    return {
      ...counts,
      totalBeats: total,
      perfectPercentage:
        total > 0 ? Math.round((counts.perfect / total) * 10000) / 100 : 0,
    };
  }

  private advanceToNextBeat(): TempoTarget | null {
    if (this.currentBeatIndex < this.beatSchedule.length) {
      return this.beatSchedule[this.currentBeatIndex]!;
    }
    return null;
  }
}

export { TICKS_PER_BEAT, PERFECT_WINDOW, EARLY_WINDOW, LATE_WINDOW };
