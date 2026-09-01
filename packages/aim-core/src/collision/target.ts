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
