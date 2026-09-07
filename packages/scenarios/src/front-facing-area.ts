import {
  AngleDeltaUnits,
  createAngleDeltaUnits,
  degreesToAngleDeltaUnits,
} from "@findmysensi/aim-core";

/**
 * Smallest angular gain the deterministic input paths address a scenario with,
 * in angle units per whole mouse count.
 */
export const DETERMINISTIC_GAIN_UNITS = 2_500;

/**
 * Quantum every front-facing half-extent is snapped to.
 *
 * A 5-slot lattice puts its slot centres at -H, -H/2, 0, +H/2 and +H. For all
 * five to be reachable from whole mouse counts, H/2 must be a whole multiple of
 * the gain, so H itself must be a multiple of twice the gain. `generateGridSlots`
 * floors both the start offset and the step, so an unquantised half-extent also
 * drifts the centre slot off zero instead of failing loudly.
 */
export const LATTICE_QUANTUM_UNITS = DETERMINISTIC_GAIN_UNITS * 2;

function quantiseHalfExtent(degrees: number): AngleDeltaUnits {
  const raw = degreesToAngleDeltaUnits(degrees);
  return createAngleDeltaUnits(
    Math.round(raw / LATTICE_QUANTUM_UNITS) * LATTICE_QUANTUM_UNITS,
  );
}

/**
 * Shared medium envelope for drills that face a single forward arena.
 *
 * At the canonical 103 degree horizontal FOV on a 16:9 viewport, a player can
 * aim at either edge and still see the opposite edge. Full-turn and 180 degree
 * scenarios intentionally do not use this envelope.
 *
 * The extents are snapped to `LATTICE_QUANTUM_UNITS`, which costs at most
 * 0.06 degrees against the nominal figures below -- far below anything
 * perceivable, and required to keep slot centres exactly addressable.
 */
export const MEDIUM_SPAWN_HALF_WIDTH_DEGREES = 24;
export const MEDIUM_SPAWN_HALF_HEIGHT_DEGREES = 14;

export const MEDIUM_SPAWN_HALF_WIDTH_UNITS = quantiseHalfExtent(
  MEDIUM_SPAWN_HALF_WIDTH_DEGREES,
);
export const MEDIUM_SPAWN_HALF_HEIGHT_UNITS = quantiseHalfExtent(
  MEDIUM_SPAWN_HALF_HEIGHT_DEGREES,
);
export const MEDIUM_SPAWN_WIDTH_UNITS = MEDIUM_SPAWN_HALF_WIDTH_UNITS * 2;
export const MEDIUM_SPAWN_HEIGHT_UNITS = MEDIUM_SPAWN_HALF_HEIGHT_UNITS * 2;
