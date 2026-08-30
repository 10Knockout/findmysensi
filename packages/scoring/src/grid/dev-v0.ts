import { GridMetrics } from "@findmysensi/analytics";

export interface ScoreResult {
  readonly score: number;
  readonly metrics: GridMetrics;
}

/**
 * Explicit development-only Practice score formula.
 * Base score: 1000 per hit.
 * Penalty: 200 per miss.
 * Clamped to 0 minimum.
 */
export function computeGridDevScore(metrics: GridMetrics): ScoreResult {
  const hitPoints = metrics.hits * 1000;
  const missPenalty = metrics.misses * 200;
  const rawScore = Math.max(0, hitPoints - missPenalty);

  return Object.freeze({
    score: rawScore,
    metrics,
  });
}
