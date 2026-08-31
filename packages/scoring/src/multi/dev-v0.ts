import { FlickMetrics } from "@findmysensi/analytics";

export interface MultiScoreResult {
  readonly score: number;
  readonly metrics: FlickMetrics;
}

/**
 * Multi scoring: speed-oriented switching.
 * 800 points per hit, 150 penalty per miss.
 * Speed bonus: KPS ≥4 → 1.15x, KPS ≥6 → 1.3x.
 */
export function computeMultiDevScore(metrics: FlickMetrics): MultiScoreResult {
  const hitPoints = metrics.hits * 800;
  const missPenalty = metrics.misses * 150;
  let rawScore = Math.max(0, hitPoints - missPenalty);

  if (metrics.killsPerSecond >= 6) {
    rawScore = Math.floor(rawScore * 1.3);
  } else if (metrics.killsPerSecond >= 4) {
    rawScore = Math.floor(rawScore * 1.15);
  }

  return Object.freeze({ score: rawScore, metrics });
}
