import { FlickMetrics } from "@findmysensi/analytics";

export interface StrafeScoreResult {
  readonly score: number;
  readonly metrics: FlickMetrics;
}

/**
 * Strafe scoring: moving target tracking via clicks.
 * 1200 points per hit (harder to click moving targets), 250 penalty per miss.
 * Accuracy bonus: ≥90% → 1.15x, ≥95% → 1.3x.
 */
export function computeStrafeDevScore(
  metrics: FlickMetrics,
): StrafeScoreResult {
  const hitPoints = metrics.hits * 1200;
  const missPenalty = metrics.misses * 250;
  let rawScore = Math.max(0, hitPoints - missPenalty);

  if (metrics.accuracyPercentage >= 95) {
    rawScore = Math.floor(rawScore * 1.3);
  } else if (metrics.accuracyPercentage >= 90) {
    rawScore = Math.floor(rawScore * 1.15);
  }

  return Object.freeze({ score: rawScore, metrics });
}
