import { TempoMetrics } from "@findmysensi/analytics";

export interface TempoScoreResult {
  readonly score: number;
  readonly metrics: TempoMetrics;
}

/**
 * Tempo scoring: rhythmic click timing.
 * Perfect: 1000 points, Early: 500 points, Late: 300 points, Miss: 0 points.
 * Streak bonus: ≥10 consecutive perfects → 1.25x on the whole score.
 */
export function computeTempoDevScore(
  metrics: TempoMetrics,
  maxConsecutivePerfects: number = 0,
): TempoScoreResult {
  let rawScore =
    metrics.perfect * 1000 + metrics.early * 500 + metrics.late * 300;

  if (maxConsecutivePerfects >= 10) {
    rawScore = Math.floor(rawScore * 1.25);
  }

  return Object.freeze({ score: rawScore, metrics });
}
