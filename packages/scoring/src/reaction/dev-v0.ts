import type { GridMetrics } from "@findmysensi/analytics";

export interface ReactionScoreResult {
  readonly score: number;
  readonly metrics: GridMetrics;
}

export function computeReactionDevScore(
  metrics: GridMetrics,
): ReactionScoreResult {
  let score = Math.max(0, metrics.hits * 1_500 - metrics.misses * 400);
  if (metrics.avgAcquisitionTicks > 0 && metrics.avgAcquisitionTicks <= 32) {
    score = Math.floor(score * 1.3);
  } else if (
    metrics.avgAcquisitionTicks > 0 &&
    metrics.avgAcquisitionTicks <= 64
  ) {
    score = Math.floor(score * 1.15);
  }
  return Object.freeze({ score, metrics });
}
