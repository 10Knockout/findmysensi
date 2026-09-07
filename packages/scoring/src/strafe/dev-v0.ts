import { TrackingMetrics } from "@findmysensi/analytics";

export interface StrafeScoreResult {
  readonly score: number;
  readonly metrics: TrackingMetrics;
}

/**
 * Strafe Track scoring: reactive horizontal tracking, no clicking.
 * Base: on-target percentage * 1000 (max 100,000 for a perfect run).
 * Precision bonus: average error under 20000 units -> 1.2x.
 * Instability penalty: a max error over 250000 units -> 0.9x, which catches a
 * run that tracked well on average but lost the target completely at a
 * direction change.
 */
export function computeStrafeDevScore(
  metrics: TrackingMetrics,
): StrafeScoreResult {
  let rawScore = Math.floor(metrics.onTargetPercentage * 1000);

  if (metrics.averageErrorUnits > 0 && metrics.averageErrorUnits < 20_000) {
    rawScore = Math.floor(rawScore * 1.2);
  }

  if (metrics.maxErrorUnits > 250_000) {
    rawScore = Math.floor(rawScore * 0.9);
  }

  return Object.freeze({ score: rawScore, metrics });
}
