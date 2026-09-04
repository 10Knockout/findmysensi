import {
  AngleUnits,
  createAngleUnits,
  PitchUnits,
  shortestSignedAngleDelta,
} from "../fixed/angle.js";
import { checkFixed } from "../fixed/range.js";

export interface TargetCollisionGeometry {
  readonly id: number;
  readonly xAngleUnits: number;
  readonly yAngleUnits: number;
  readonly radiusAngleUnits: number;
}

export function testAngularHit(
  yaw: AngleUnits,
  pitch: PitchUnits,
  target: TargetCollisionGeometry,
): boolean {
  const dx = shortestSignedAngleDelta(
    yaw,
    createAngleUnits(target.xAngleUnits),
  );
  const dy = checkFixed(target.yAngleUnits) - checkFixed(pitch);
  const radius = checkFixed(target.radiusAngleUnits);

  const distSq = BigInt(dx) * BigInt(dx) + BigInt(dy) * BigInt(dy);
  const radiusSq = BigInt(radius) * BigInt(radius);
  return distSq <= radiusSq;
}

export function findHitTarget(
  yaw: AngleUnits,
  pitch: PitchUnits,
  targets: readonly TargetCollisionGeometry[],
): TargetCollisionGeometry | null {
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!;
    if (testAngularHit(yaw, pitch, target)) {
      return target;
    }
  }
  return null;
}

export interface NearestTargetResult {
  readonly target: TargetCollisionGeometry;
  /** Signed yaw distance from aim to target, shortest path across the wrap seam. */
  readonly dx: number;
  /** Signed pitch distance from aim to target (no wraparound). */
  readonly dy: number;
}

/**
 * Finds the angularly closest target to the given aim point, regardless of
 * whether it was actually hit. Used for miss classification (how far off,
 * and in which direction) -- never for hit resolution, which stays
 * findHitTarget's exact boundary-inclusive circle test.
 */
export function findNearestTarget(
  yaw: AngleUnits,
  pitch: PitchUnits,
  targets: readonly TargetCollisionGeometry[],
): NearestTargetResult | null {
  let closest: NearestTargetResult | null = null;
  let closestDistSq = Infinity;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!;
    const dx = shortestSignedAngleDelta(
      yaw,
      createAngleUnits(target.xAngleUnits),
    );
    const dy = checkFixed(target.yAngleUnits) - checkFixed(pitch);
    const distSq = dx * dx + dy * dy;
    if (distSq < closestDistSq) {
      closestDistSq = distSq;
      closest = { target, dx, dy };
    }
  }

  return closest;
}
