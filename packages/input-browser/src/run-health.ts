import { DrainStats } from "./ring-buffer.js";

export interface InputPathHealth {
  readonly observedRateHz: number;
  readonly highWaterMark: number;
  readonly overflowCount: number;
  readonly lostTemporalPrecision: boolean;
  readonly isStableForRanked: boolean;
  readonly rejectionReason?: string | undefined;
}

export function evaluateInputHealth(
  stats: DrainStats,
  elapsedMs: number,
  capacity: number,
): InputPathHealth {
  const safeElapsedMs = Math.max(1, elapsedMs);
  const observedRateHz = Math.round(
    (stats.drainedCount / safeElapsedMs) * 1000,
  );

  if (stats.lostTemporalPrecision || stats.overflowCount > 0) {
    return {
      observedRateHz,
      highWaterMark: stats.highWaterMark,
      overflowCount: stats.overflowCount,
      lostTemporalPrecision: stats.lostTemporalPrecision,
      isStableForRanked: false,
      rejectionReason: `Input ring buffer overflow: lost temporal precision (${stats.overflowCount} dropped events).`,
    };
  }

  // Safety headroom check: high water mark exceeding 95% of buffer capacity
  const saturationThreshold = capacity * 0.95;
  if (stats.highWaterMark >= saturationThreshold) {
    return {
      observedRateHz,
      highWaterMark: stats.highWaterMark,
      overflowCount: 0,
      lostTemporalPrecision: false,
      isStableForRanked: false,
      rejectionReason: `Input queue near saturation (${stats.highWaterMark}/${capacity} peak events in interval).`,
    };
  }

  return {
    observedRateHz,
    highWaterMark: stats.highWaterMark,
    overflowCount: 0,
    lostTemporalPrecision: false,
    isStableForRanked: true,
  };
}
