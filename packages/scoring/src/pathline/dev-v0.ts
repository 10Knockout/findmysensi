export interface PathlineScoreMetrics {
  readonly segmentsCompleted: number;
  readonly cleanSegments: number;
  readonly misses: number;
}

/** A clean path is worth twice a path that left the corridor. */
export function computePathlineScore(metrics: PathlineScoreMetrics): number {
  return Math.max(
    0,
    (metrics.segmentsCompleted + metrics.cleanSegments) * 500 -
      metrics.misses * 100,
  );
}
