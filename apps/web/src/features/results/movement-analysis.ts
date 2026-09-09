import { classifyMiss, type MissDirection } from "@findmysensi/analytics";
import { toShotOffsets, type RunTrace } from "@findmysensi/trainer-runtime";

/** Furthest offset the scatter plots; anything past this is clamped to the edge. */
const PLOT_CLAMP_RADII = 3;

export interface MovementAnalysisPoint {
  /** Horizontal offset in target radii, clamped to [-3, 3] for plotting. */
  readonly dx: number;
  /** Vertical offset in target radii, clamped to [-3, 3] for plotting. */
  readonly dy: number;
  readonly hit: boolean;
}

export interface MovementAnalysis {
  readonly points: readonly MovementAnalysisPoint[];
  readonly missTally: Readonly<Record<MissDirection, number>>;
  /** Mean |offset| over misses, in target radii. 0 when there were no misses. */
  readonly meanMissDistanceRadii: number;
  /** Misses landing beyond one radius / total misses. 0 when no misses. */
  readonly overflickRatio: number;
}

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

/**
 * Pure results-screen view-model: turns a per-run `RunTrace` into a scatter of
 * target-normalized shot offsets plus a five-way miss tally and over/under-flick
 * summary. No I/O, no persistence -- built fresh from the trace each render.
 */
export function buildMovementAnalysis(trace: RunTrace): MovementAnalysis {
  const offsets = toShotOffsets(trace);

  const points: MovementAnalysisPoint[] = offsets.map((offset) => ({
    dx: clamp(offset.dx, PLOT_CLAMP_RADII),
    dy: clamp(offset.dy, PLOT_CLAMP_RADII),
    hit: offset.hit,
  }));

  const missTally: Record<MissDirection, number> = {
    left: 0,
    right: 0,
    up: 0,
    down: 0,
    unclear: 0,
  };

  let missDistanceSum = 0;
  let overflickCount = 0;
  let missCount = 0;

  for (const shot of trace.shots) {
    if (shot.hit) continue;
    missCount += 1;

    const distanceRadii = Math.hypot(
      (shot.aimYaw - shot.targetYaw) / shot.targetRadius,
      (shot.aimPitch - shot.targetPitch) / shot.targetRadius,
    );
    missDistanceSum += distanceRadii;
    if (distanceRadii > 1) overflickCount += 1;

    // classifyMiss is written for "which way to correct" (target minus aim);
    // the heatmap wants "which way the shot landed", so pass aim minus target
    // and reuse only its dominant-axis / "unclear" thresholding.
    const { direction } = classifyMiss(
      shot.aimYaw - shot.targetYaw,
      shot.aimPitch - shot.targetPitch,
      shot.targetRadius,
    );
    missTally[direction] += 1;
  }

  return {
    points,
    missTally,
    meanMissDistanceRadii: missCount === 0 ? 0 : missDistanceSum / missCount,
    overflickRatio: missCount === 0 ? 0 : overflickCount / missCount,
  };
}
