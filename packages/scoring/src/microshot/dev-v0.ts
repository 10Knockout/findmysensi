import type { GridMetrics } from "@findmysensi/analytics";

export interface MicroshotScoreResult {
  readonly score: number;
  readonly metrics: GridMetrics;
}

export function computeMicroshotDevScore(
  metrics: GridMetrics,
): MicroshotScoreResult {
  let score = Math.max(0, metrics.hits * 1_100 - metrics.misses * 300);
  if (metrics.accuracyPercentage >= 95) score = Math.floor(score * 1.25);
  else if (metrics.accuracyPercentage >= 90) score = Math.floor(score * 1.1);
  return Object.freeze({ score, metrics });
}
