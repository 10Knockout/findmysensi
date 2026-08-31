import { createPrngV1, PrngV1 } from "@findmysensi/aim-core";
import { findHitTarget, wrapYaw } from "@findmysensi/aim-core";

export const GRID_TARGET_RADIUS = 50000;
export const GRID_MAX_TARGETS = 3;
export const GRID_DURATION_TICKS = 128 * 60; // 60 seconds at 128Hz

export class GridMechanics {
  public targets: Array<{
    id: number;
    xAngleUnits: number;
    yAngleUnits: number;
    radiusAngleUnits: number;
  }> = [];
  private rng: PrngV1;
  private spawnCount = 0;

  constructor(seed: Uint8Array) {
    this.rng = createPrngV1(seed);
    for (let i = 0; i < GRID_MAX_TARGETS; i++) {
      this.spawnTarget();
    }
  }

  private spawnTarget() {
    // Generate within a sensible field of view, then wrap to valid AngleUnits
    const x = this.rng.nextRange(-2000000, 2000000);
    const y = this.rng.nextRange(-1000000, 1000000);

    this.targets.push({
      id: this.spawnCount++,
      xAngleUnits: wrapYaw(x),
      yAngleUnits: wrapYaw(y),
      radiusAngleUnits: GRID_TARGET_RADIUS,
    });
  }

  public processShot(yaw: number, pitch: number): boolean {
    const hit = findHitTarget(wrapYaw(yaw), wrapYaw(pitch), this.targets);
    if (hit) {
      this.targets = this.targets.filter((t) => t.id !== hit.id);
      this.spawnTarget();
      return true;
    }
    return false;
  }
}

export const gridDescriptor = {
  id: "grid-v1-candidate",
  rankedEligible: false,
  durationTicks: GRID_DURATION_TICKS,
};
