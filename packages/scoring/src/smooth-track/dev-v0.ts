import { TrackingMetrics } from "@findmysensi/analytics";

export interface SmoothTrackScoreResult {
  readonly score: number;
  readonly metrics: TrackingMetrics;
}

/**
 * Smooth Track scoring: continuous beam tracking.
 * Base: on-target percentage * 1000 (max 100,000 at 100%).
 * Accuracy bonus: average error < 15000 units → 1.2x multiplier.
 * Consistency penalty: max error > 200000 → 0.9x multiplier.
 */
export function computeSmoothTrackDevScore(
  metrics: TrackingMetrics,
): SmoothTrackScoreResult {
  let rawScore = Math.floor(metrics.onTargetPercentage * 1000);

  if (metrics.averageErrorUnits > 0 && metrics.averageErrorUnits < 15000) {
    rawScore = Math.floor(rawScore * 1.2);
  }

  if (metrics.maxErrorUnits > 200000) {
    rawScore = Math.floor(rawScore * 0.9);
  }

  return Object.freeze({ score: rawScore, metrics });
}
