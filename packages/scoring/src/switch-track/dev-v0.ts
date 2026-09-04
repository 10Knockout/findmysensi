import type { SwitchTrackMetrics } from "@findmysensi/analytics";

export interface SwitchTrackScoreResult {
  readonly score: number;
  readonly metrics: SwitchTrackMetrics;
}

export function computeSwitchTrackDevScore(
  metrics: SwitchTrackMetrics,
): SwitchTrackScoreResult {
  let score =
    metrics.switchesCompleted * 2_000 +
    Math.floor(metrics.onTargetPercentage * 100);
  if (
    metrics.averageAcquisitionTicks > 0 &&
    metrics.averageAcquisitionTicks <= 64
  ) {
    score = Math.floor(score * 1.15);
  }
  return Object.freeze({ score, metrics });
}
