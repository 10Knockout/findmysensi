import type { RuntimeScoreResult } from "@findmysensi/trainer-runtime";

export const TRIAL_SECONDS = 10;
export const COUNTDOWN_SECONDS = 2;
export const STRAFE_TARGET_PERCENT = 30;

export const COMPARISONS = [
  { mode: "grid", label: "Grid Rush", step: 0.45 },
  { mode: "headline", label: "Headshot Lane", step: 0.34 },
  { mode: "strafe", label: "Strafe Track", step: 0.25 },
  { mode: "multi", label: "Multi Burst", step: 0.18 },
  { mode: "reaction", label: "Reflex Rush", step: 0.12 },
  { mode: "microshot", label: "Micro Flick", step: 0.08 },
  { mode: "microshot", label: "Final adjustment", step: 0 },
] as const;

export const ACTIVE_SECONDS = COMPARISONS.length * 2 * TRIAL_SECONDS;
const MIN_SENSITIVITY = 0.000001;
const MAX_SENSITIVITY = 100;

type Seed = readonly [number, number, number, number];
type ComparisonMode = (typeof COMPARISONS)[number]["mode"];

interface Trial {
  readonly sensitivity: number;
  readonly score: number;
  readonly strafeOnTarget: number | null;
}

export interface CalibrationPair {
  readonly index: number;
  readonly baseline: number;
  readonly lowerFirst: boolean;
  readonly direction: -1 | 1;
  readonly candidates: readonly [number, number];
  readonly seed: Seed;
  readonly first?: Trial;
}

export interface PairOutcome {
  readonly preferred: number;
  readonly low: number;
  readonly high: number;
  readonly direction: -1 | 1;
  readonly decisive: boolean;
  readonly strafeOnTarget: number | null;
  readonly hasScore: boolean;
}

export function formatSensitivity(value: number): string {
  return Number(value.toFixed(6)).toString();
}

export function parseSensitivityInput(value: string): number | null {
  const text = value.trim();
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(text)) return null;
  const sensitivity = Number(text);
  return Number.isFinite(sensitivity) && sensitivity > 0 ? sensitivity : null;
}

export function isBrowserSensitivity(value: number): boolean {
  return value >= MIN_SENSITIVITY && value <= MAX_SENSITIVITY;
}

function candidate(value: number): number {
  return Number(
    formatSensitivity(
      Math.max(MIN_SENSITIVITY, Math.min(MAX_SENSITIVITY, value)),
    ),
  );
}

export function buildPair(
  index: number,
  baseline: number,
  direction: -1 | 1,
  lowerFirst: boolean,
  seed: Seed,
): CalibrationPair {
  const comparison = COMPARISONS[index]!;
  const step = Math.max(
    0.000001,
    comparison.step === 0
      ? Math.min(0.01, baseline * 0.25)
      : baseline * comparison.step,
  );
  const center = candidate(baseline);
  const below = candidate(center - step);
  const above = candidate(center + step);
  const alternate = direction === 1 ? above : below;
  const [low, high] =
    index === 0
      ? [below, above]
      : alternate < center || (alternate === center && below < center)
        ? [below, center]
        : [center, above];
  return {
    index,
    baseline: center,
    direction,
    lowerFirst,
    seed,
    candidates: lowerFirst ? [low, high] : [high, low],
  };
}

export function recordTrial(
  mode: ComparisonMode,
  sensitivity: number,
  result: RuntimeScoreResult,
): Trial {
  return {
    sensitivity,
    score: result.score,
    strafeOnTarget:
      mode === "strafe" && "onTargetPercentage" in result.metrics
        ? result.metrics.onTargetPercentage
        : null,
  };
}

export function comparePair(
  pair: CalibrationPair,
  first: Trial,
  second: Trial,
): PairOutcome {
  const low = Math.min(first.sensitivity, second.sensitivity);
  const high = Math.max(first.sensitivity, second.sensitivity);
  const best = first.score > second.score ? first : second;
  const strafeOnTarget =
    first.strafeOnTarget === null || second.strafeOnTarget === null
      ? null
      : Math.max(first.strafeOnTarget, second.strafeOnTarget);
  const gap = Math.abs(first.score - second.score) / Math.max(1, best.score);
  const trackingBelowTarget =
    strafeOnTarget !== null && strafeOnTarget < STRAFE_TARGET_PERCENT;
  const decisive = gap >= (trackingBelowTarget ? 0.2 : 0.08);
  const preferred = decisive ? best.sensitivity : pair.baseline;
  return {
    preferred,
    low,
    high,
    direction:
      preferred === pair.baseline
        ? pair.direction === 1
          ? -1
          : 1
        : preferred > pair.baseline
          ? 1
          : -1,
    decisive,
    strafeOnTarget,
    hasScore: best.score > 0,
  };
}
