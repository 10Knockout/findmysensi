import { AngleUnits } from "../fixed/angle.js";

export interface TargetCollisionGeometry {
  readonly id: number;
  readonly xAngleUnits: number;
  readonly yAngleUnits: number;
  readonly radiusAngleUnits: number;
}

export function testAngularHit(
  yaw: AngleUnits,
  pitch: AngleUnits,
  target: TargetCollisionGeometry,
): boolean {
  const dx = (yaw as number) - target.xAngleUnits;
  const dy = (pitch as number) - target.yAngleUnits;
  const distSq = dx * dx + dy * dy;
  const radiusSq = target.radiusAngleUnits * target.radiusAngleUnits;
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
