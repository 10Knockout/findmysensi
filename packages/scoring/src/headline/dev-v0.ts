import { FlickMetrics } from "@findmysensi/analytics";

export interface HeadlineScoreResult {
  readonly score: number;
  readonly metrics: FlickMetrics;
}

/**
 * Headline scoring: horizontal flick corridor.
 * 1000 points per hit, 200 penalty per miss.
 * Fast acquisition bonus: avg acquisition <40 ticks → 1.2x.
 */
export function computeHeadlineDevScore(
  metrics: FlickMetrics,
): HeadlineScoreResult {
  const hitPoints = metrics.hits * 1000;
  const missPenalty = metrics.misses * 200;
  let rawScore = Math.max(0, hitPoints - missPenalty);

  if (metrics.avgAcquisitionTicks > 0 && metrics.avgAcquisitionTicks < 40) {
    rawScore = Math.floor(rawScore * 1.2);
  }

  return Object.freeze({ score: rawScore, metrics });
}
