import {
  AngleUnits,
  FULL_TURN_UNITS,
  HALF_TURN_UNITS,
  PitchUnits,
  createPitchUnits,
  wrapYaw,
} from "./angle.js";
import { DEFAULT_MAX_PITCH_UNITS } from "./range.js";

/**
 * Camera travel limits are derived from the scenario's spawn area plus half of
 * a CANONICAL field of view -- deliberately NOT the player's configured FOV.
 *
 * A player-configurable FOV would make the same recorded input replay to a
 * different aim path on a different machine, which would break the exact-replay
 * guarantee the ranked pipeline depends on. Pinning the margin to the canonical
 * 103 deg / 16:9 reference keeps bounds identical for every client while still
 * being generous enough that the whole play area stays reachable on any FOV.
 */
export const CANONICAL_HFOV_DEGREES = 103;
export const CANONICAL_ASPECT_RATIO = 16 / 9;

/** round(51.5 / 360 * FULL_TURN_UNITS) */
export const CANONICAL_HALF_HFOV_UNITS = 2_400_074;
/** round(atan(tan(51.5 deg) / (16/9)) / 360 * FULL_TURN_UNITS) -- 35.2664 deg */
export const CANONICAL_HALF_VFOV_UNITS = 1_643_533;

export interface CameraBounds {
  /** Maximum absolute yaw offset from the play-area centre, in angle units. */
  readonly maxYawUnits: number;
  /** Maximum absolute pitch offset from the play-area centre, in angle units. */
  readonly maxPitchUnits: number;
}

function assertSpawnExtent(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      `${label} must be a non-negative safe integer. Received ${value}.`,
    );
  }
}

/**
 * Bounds the camera to the scenario's play area plus half a screen of margin,
 * so the furthest target can sit at the screen edge but never travel off it.
 *
 * Without this the only vertical limit is the 89.9 deg gimbal clamp, which sits
 * roughly 2.25 inches of mouse travel below centre at default sensitivity --
 * far outside the play area, leaving the player stuck against an invisible wall
 * in empty space.
 */
export function resolveCameraBounds(
  spawnAreaWidthUnits: number,
  spawnAreaHeightUnits: number,
): CameraBounds {
  assertSpawnExtent(spawnAreaWidthUnits, "spawnAreaWidthUnits");
  assertSpawnExtent(spawnAreaHeightUnits, "spawnAreaHeightUnits");

  const maxYawUnits = Math.min(
    Math.floor(spawnAreaWidthUnits / 2) + CANONICAL_HALF_HFOV_UNITS,
    HALF_TURN_UNITS,
  );
  const maxPitchUnits = Math.min(
    Math.floor(spawnAreaHeightUnits / 2) + CANONICAL_HALF_VFOV_UNITS,
    DEFAULT_MAX_PITCH_UNITS,
  );

  return Object.freeze({ maxYawUnits, maxPitchUnits });
}

/** Clamps pitch to the play-area limit instead of the raw gimbal clamp. */
export function clampPitchToBounds(
  value: number,
  bounds: CameraBounds,
): PitchUnits {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Pitch must be a safe integer. Received ${value}.`);
  }
  if (value > bounds.maxPitchUnits)
    return createPitchUnits(bounds.maxPitchUnits);
  if (value < -bounds.maxPitchUnits) {
    return createPitchUnits(-bounds.maxPitchUnits);
  }
  return createPitchUnits(value);
}

/**
 * Clamps yaw symmetrically around the play-area centre.
 *
 * Yaw is stored wrapped into [0, FULL_TURN_UNITS), so a small left-of-centre
 * angle is represented as a large positive number. Comparing that raw value
 * against a limit would clamp the wrong side, so the value is first re-signed
 * about the shortest path from centre.
 */
export function clampYawToBounds(
  value: number,
  bounds: CameraBounds,
): AngleUnits {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Yaw must be a safe integer. Received ${value}.`);
  }
  const wrapped = wrapYaw(value);
  const signed =
    wrapped >= HALF_TURN_UNITS ? wrapped - FULL_TURN_UNITS : wrapped;

  if (signed > bounds.maxYawUnits) return wrapYaw(bounds.maxYawUnits);
  if (signed < -bounds.maxYawUnits) return wrapYaw(-bounds.maxYawUnits);
  return wrapped;
}
