import { FlickMetrics } from "@findmysensi/analytics";

export interface Turn180ScoreResult {
  readonly score: number;
  readonly metrics: FlickMetrics;
}

/**
 * 180 Flick scoring: the highest per-hit value of the flick family, because
 * every repetition costs a near-complete turn. Accuracy is weighted heavily
 * -- overshooting a 180 and then hunting for the target is the exact failure
 * this exercise exists to expose.
 * 1800 per hit, 400 per miss.
 */
export function computeTurn180DevScore(
  metrics: FlickMetrics,
): Turn180ScoreResult {
  const hitPoints = metrics.hits * 1800;
  const missPenalty = metrics.misses * 400;
  let rawScore = Math.max(0, hitPoints - missPenalty);

  if (metrics.accuracyPercentage >= 95) {
    rawScore = Math.floor(rawScore * 1.35);
  } else if (metrics.accuracyPercentage >= 85) {
    rawScore = Math.floor(rawScore * 1.15);
  }

  return Object.freeze({ score: rawScore, metrics });
}
