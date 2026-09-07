import { PracticeSummaryRecord } from "./results.js";

export interface ExerciseRecommendation {
  readonly modeId: PracticeSummaryRecord["modeId"];
  readonly reason: string;
}

const CLICK_MODE_IDS = new Set<PracticeSummaryRecord["modeId"]>([
  "grid",
  "pinpoint",
  "multi",
  "headline",
  "microshot",
  "reaction",
  "anchor-flick",
  "motion-flick",
  "turn180",
]);

interface ClickAccuracyRecord {
  readonly modeId: PracticeSummaryRecord["modeId"];
  readonly accuracyPercentage: number;
}

function hasAccuracy(
  record: PracticeSummaryRecord,
): record is PracticeSummaryRecord & ClickAccuracyRecord {
  return CLICK_MODE_IDS.has(record.modeId);
}

/**
 * Recommends the exercise to train next, based on real accuracy history
 * across the click-discrete modes (the only family that currently shares a
 * directly comparable metric). Returns null -- never a fabricated guess --
 * when there isn't enough real data to compare: no history, or fewer than
 * two distinct click modes played.
 */
export function recommendNextExercise(
  history: readonly PracticeSummaryRecord[],
): ExerciseRecommendation | null {
  const totals = new Map<
    PracticeSummaryRecord["modeId"],
    { sum: number; count: number }
  >();

  for (const record of history) {
    if (!hasAccuracy(record)) continue;
    const entry = totals.get(record.modeId) ?? { sum: 0, count: 0 };
    entry.sum += record.accuracyPercentage;
    entry.count += 1;
    totals.set(record.modeId, entry);
  }

  if (totals.size < 2) return null;

  let weakestModeId: PracticeSummaryRecord["modeId"] | null = null;
  let weakestAverage = Infinity;

  for (const [modeId, { sum, count }] of totals) {
    const average = sum / count;
    if (average < weakestAverage) {
      weakestAverage = average;
      weakestModeId = modeId;
    }
  }

  if (!weakestModeId) return null;

  return {
    modeId: weakestModeId,
    reason: `Your average accuracy in ${weakestModeId} is ${weakestAverage.toFixed(1)}%, the lowest among the modes you've played.`,
  };
}
