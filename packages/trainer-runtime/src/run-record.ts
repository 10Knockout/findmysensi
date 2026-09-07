import type { PracticeSummaryRecord } from "./results.js";

/**
 * Run records: the durable, versioned account of a single completed run.
 *
 * Three version numbers travel with every run and they are deliberately
 * separate:
 *
 *   scenarioVersion  the exercise's own rules (target sizes, speeds, spawns)
 *   scoringVersion   how a score was derived from the metrics
 *   analyticsVersion how the derived analytics were computed
 *
 * Changing any one of them later must not silently make old and new runs look
 * comparable. A leaderboard may only ever mix runs that agree on scenario and
 * scoring version; analytics may only be compared across runs that also agree
 * on analytics version.
 *
 * This module is intentionally local-first and protocol-free. Protocol V1 is
 * frozen ("V1 is completely immutable once frozen. Any new fields require
 * V2"). Nothing here is a wire format; the application maps this model onto
 * the separately versioned V2 submission contract at the network boundary.
 */

/** Bumped whenever derived analytics change meaning. */
export const ANALYTICS_VERSION = 1;

/**
 * Why a completed run cannot appear on a leaderboard. A run can be perfectly
 * valid for the player's own history while still being ineligible to compete.
 *
 * These are technical facts about the run, not accusations. A dropped pointer
 * lock is an ordinary browser event, not evidence of cheating, and the
 * user-facing wording must stay neutral.
 */
export type RunInvalidationReason =
  | "paused-mid-run"
  | "settings-changed-mid-run"
  | "sensitivity-changed-mid-run"
  | "pointer-lock-lost"
  | "raw-input-unavailable"
  | "simulation-desync"
  | "debug-override-active"
  | "run-incomplete";

/**
 * Everything about the machine and configuration that could change what a
 * score means, captured at RUN START.
 *
 * Captured at start and never re-read: rendering an old run against the
 * player's *current* settings would silently misattribute the result.
 */
export interface RunSettingsSnapshot {
  /** The value the player actually had in the box. */
  readonly fmsSensitivity: string;
  readonly nominalDpi: number | null;
  /** Canonical physical turn distance, the only cross-setup comparable. */
  readonly cmPer360: number | null;
  readonly fovDegrees: number;
  readonly resolution: string;
  /** Actual canvas backing store, which is what was really rendered. */
  readonly backingWidth: number;
  readonly backingHeight: number;
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly devicePixelRatio: number;
  readonly scalingMode: string;
  readonly fullscreen: boolean;
  readonly graphicsPreset: string;
  readonly crosshairCode: string | null;
  /** Whether unadjusted (raw) Pointer Lock was actually granted. */
  readonly rawPointerInputAccepted: boolean;
  /** Coarse only -- enough to spot a platform pattern, not to fingerprint. */
  readonly platform: string;
  readonly browser: string;
  /**
   * Measured from rAF timing. Deliberately NOT called "refresh rate": a
   * browser cannot read the monitor's true refresh rate, and presenting a
   * derived number as hardware truth would be a fabrication.
   */
  readonly medianRenderFps: number | null;
  readonly p95FrameTimeMs: number | null;
  readonly inputOverflowEvents: number;
  readonly inputHighWaterMark: number;
}

export interface RunRecord {
  readonly runId: string;
  readonly modeId: PracticeSummaryRecord["modeId"];
  readonly scenarioVersion: number;
  readonly scoringVersion: number;
  readonly analyticsVersion: number;
  /** The seed that makes this run reproducible. */
  readonly seed: readonly [number, number, number, number];
  /** Epoch milliseconds. */
  readonly startedAt: number;
  readonly completedAt: number;
  /** Time actually spent playing, excluding any paused stretches. */
  readonly activeDurationMs: number;
  readonly finalScore: number;
  readonly leaderboardEligible: boolean;
  readonly invalidationReasons: readonly RunInvalidationReason[];
  readonly settings: RunSettingsSnapshot;
  readonly summary: PracticeSummaryRecord;
}

/** Neutral, user-facing wording for why a run is not ranked. */
export const RUN_INVALIDATION_MESSAGES: Record<RunInvalidationReason, string> =
  {
    "paused-mid-run": "The run was paused.",
    "settings-changed-mid-run": "Settings changed during the run.",
    "sensitivity-changed-mid-run": "Sensitivity changed during the run.",
    "pointer-lock-lost": "Mouse lock was interrupted.",
    "raw-input-unavailable": "Raw mouse input was not available.",
    "simulation-desync": "The simulation could not be verified.",
    "debug-override-active": "A debug option was active.",
    "run-incomplete": "The run did not finish.",
  };

export interface RunEligibilityInput {
  readonly wasPaused: boolean;
  readonly settingsChangedMidRun: boolean;
  readonly sensitivityChangedMidRun: boolean;
  readonly pointerLockLost: boolean;
  readonly rawPointerInputAccepted: boolean;
  readonly exactReplayPreserved: boolean;
  readonly debugOverrideActive: boolean;
  readonly completed: boolean;
}

/**
 * Decides whether a finished run may compete, and why not if it may not.
 *
 * Deliberately returns every applicable reason rather than the first: a player
 * who paused *and* lost pointer lock should be told both, otherwise fixing one
 * and seeing the run still rejected is baffling.
 */
export function evaluateRunEligibility(input: RunEligibilityInput): {
  leaderboardEligible: boolean;
  invalidationReasons: RunInvalidationReason[];
} {
  const reasons: RunInvalidationReason[] = [];

  if (!input.completed) reasons.push("run-incomplete");
  if (input.wasPaused) reasons.push("paused-mid-run");
  if (input.settingsChangedMidRun) reasons.push("settings-changed-mid-run");
  if (input.sensitivityChangedMidRun) {
    reasons.push("sensitivity-changed-mid-run");
  }
  if (input.pointerLockLost) reasons.push("pointer-lock-lost");
  if (!input.rawPointerInputAccepted) reasons.push("raw-input-unavailable");
  if (!input.exactReplayPreserved) reasons.push("simulation-desync");
  if (input.debugOverrideActive) reasons.push("debug-override-active");

  return {
    leaderboardEligible: reasons.length === 0,
    invalidationReasons: reasons,
  };
}

/**
 * Whether two runs may be compared on a leaderboard. Mixing scenario or
 * scoring versions would rank scores that were never produced under the same
 * rules.
 */
export function isLeaderboardComparable(a: RunRecord, b: RunRecord): boolean {
  return (
    a.modeId === b.modeId &&
    a.scenarioVersion === b.scenarioVersion &&
    a.scoringVersion === b.scoringVersion
  );
}

/**
 * Whether two runs' derived analytics may be compared. Stricter than
 * leaderboard comparability, because a change to how a metric is computed
 * makes the numbers themselves incompatible.
 */
export function isAnalyticsComparable(a: RunRecord, b: RunRecord): boolean {
  return (
    isLeaderboardComparable(a, b) && a.analyticsVersion === b.analyticsVersion
  );
}

/**
 * The player's best eligible run for a mode, or null when they have none.
 * Only leaderboard-eligible runs can be a personal best -- a paused run that
 * happened to score well is not a record.
 */
export function findPersonalBest(
  runs: readonly RunRecord[],
  modeId: PracticeSummaryRecord["modeId"],
): RunRecord | null {
  let best: RunRecord | null = null;
  for (const run of runs) {
    if (run.modeId !== modeId || !run.leaderboardEligible) continue;
    if (
      best === null ||
      run.finalScore > best.finalScore ||
      // Deterministic tie-break so the record never flickers between two equal
      // scores: the earlier run keeps it.
      (run.finalScore === best.finalScore && run.completedAt < best.completedAt)
    ) {
      best = run;
    }
  }
  return best;
}

/**
 * Which runs keep their full detail. Per the retention decision, only the
 * personal best and the most recent few runs per mode stay detailed; every
 * other run keeps its summary forever but sheds the heavy analytics payload.
 *
 * This is what keeps a free-tier database bounded: detail is roughly 8 KB a
 * run, a summary roughly 300 bytes.
 */
export const DETAILED_RUNS_RETAINED_PER_MODE = 5;

export function selectRunsToRetainInDetail(
  runs: readonly RunRecord[],
  modeId: PracticeSummaryRecord["modeId"],
  retainRecent: number = DETAILED_RUNS_RETAINED_PER_MODE,
): readonly string[] {
  const forMode = runs.filter((run) => run.modeId === modeId);
  const keep = new Set<string>();

  const best = findPersonalBest(forMode, modeId);
  if (best) keep.add(best.runId);

  const recent = [...forMode].sort((a, b) => b.completedAt - a.completedAt);
  for (const run of recent.slice(0, Math.max(0, retainRecent))) {
    keep.add(run.runId);
  }

  return [...keep];
}
