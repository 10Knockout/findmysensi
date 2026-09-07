import { FlickMetrics } from "@findmysensi/analytics";

export interface AnchorFlickScoreResult {
  readonly score: number;
  readonly metrics: FlickMetrics;
}

/**
 * Anchor Flick scoring: wide flicks are worth more than short ones, and a
 * miss costs more, because the exercise is about committing to a long
 * movement and landing it rather than spraying toward the target.
 * 1400 per hit, 300 per miss, with an accuracy bonus at 90% and 95%.
 */
export function computeAnchorFlickDevScore(
  metrics: FlickMetrics,
): AnchorFlickScoreResult {
  const hitPoints = metrics.hits * 1400;
  const missPenalty = metrics.misses * 300;
  let rawScore = Math.max(0, hitPoints - missPenalty);

  if (metrics.accuracyPercentage >= 95) {
    rawScore = Math.floor(rawScore * 1.3);
  } else if (metrics.accuracyPercentage >= 90) {
    rawScore = Math.floor(rawScore * 1.15);
  }

  return Object.freeze({ score: rawScore, metrics });
}
