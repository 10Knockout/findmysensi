import { FlickMetrics } from "@findmysensi/analytics";

export interface PinpointScoreResult {
  readonly score: number;
  readonly metrics: FlickMetrics;
}

/**
 * Pinpoint scoring: precision-heavy.
 * 1500 points per hit (more than Grid since targets are much smaller).
 * 300 penalty per miss.
 * Bonus multiplier for high accuracy: ≥95% accuracy → 1.2x, ≥99% → 1.5x.
 */
export function computePinpointDevScore(
  metrics: FlickMetrics,
): PinpointScoreResult {
  const hitPoints = metrics.hits * 1500;
  const missPenalty = metrics.misses * 300;
  let rawScore = Math.max(0, hitPoints - missPenalty);

  // Accuracy bonus
  if (metrics.accuracyPercentage >= 99) {
    rawScore = Math.floor(rawScore * 1.5);
  } else if (metrics.accuracyPercentage >= 95) {
    rawScore = Math.floor(rawScore * 1.2);
  }

  return Object.freeze({ score: rawScore, metrics });
}
