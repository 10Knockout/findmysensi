import { FlickMetrics } from "@findmysensi/analytics";

export interface MotionFlickScoreResult {
  readonly score: number;
  readonly metrics: FlickMetrics;
}

/**
 * Motion Flick scoring: intercepting a moving target is harder than hitting a
 * static one, so a hit pays more than Anchor Flick. A fast average
 * acquisition earns a bonus, since the target is escaping while the player
 * lines the shot up.
 * 1600 per hit, 300 per miss.
 */
export function computeMotionFlickDevScore(
  metrics: FlickMetrics,
): MotionFlickScoreResult {
  const hitPoints = metrics.hits * 1600;
  const missPenalty = metrics.misses * 300;
  let rawScore = Math.max(0, hitPoints - missPenalty);

  if (metrics.avgAcquisitionTicks > 0 && metrics.avgAcquisitionTicks <= 48) {
    rawScore = Math.floor(rawScore * 1.25);
  } else if (
    metrics.avgAcquisitionTicks > 0 &&
    metrics.avgAcquisitionTicks <= 96
  ) {
    rawScore = Math.floor(rawScore * 1.1);
  }

  return Object.freeze({ score: rawScore, metrics });
}
