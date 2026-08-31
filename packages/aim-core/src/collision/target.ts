import { AngleUnits } from "../fixed/angle.js";

export interface TargetCollisionGeometry {
  readonly id: number;
  readonly xAngleUnits: number;
  readonly yAngleUnits: number;
  readonly radiusAngleUnits: number;
}

import { distSqBigInt } from "../fixed/range.js";

export function testAngularHit(
  yaw: AngleUnits,
  pitch: AngleUnits,
  target: TargetCollisionGeometry,
): boolean {
  const distSq = distSqBigInt(yaw as number, pitch as number, target.xAngleUnits, target.yAngleUnits);
  const radiusSq = BigInt(target.radiusAngleUnits) * BigInt(target.radiusAngleUnits);
  return distSq <= radiusSq;
}

export function findHitTarget(
  yaw: AngleUnits,
  pitch: AngleUnits,
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
