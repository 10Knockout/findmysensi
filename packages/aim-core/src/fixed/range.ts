import { AngleUnits, FULL_TURN_UNITS } from "./angle.js";

// Default pitch vertical limit ~89.9 degrees to prevent vertical gimbal lock
export const DEFAULT_MAX_PITCH_UNITS = Math.round(
  (89.9 / 360) * FULL_TURN_UNITS,
);
export const DEFAULT_MIN_PITCH_UNITS = -DEFAULT_MAX_PITCH_UNITS;

export function clampInt(value: number, min: number, max: number): number {
  if (
    !Number.isSafeInteger(value) ||
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max)
  ) {
    throw new RangeError(
      `clampInt inputs must be safe integers. Received value=${value}, min=${min}, max=${max}.`,
    );
  }
  if (min > max) {
    throw new RangeError(`min (${min}) cannot be greater than max (${max}).`);
  }
  let result = value;
  if (value < min) result = min;
  else if (value > max) result = max;
  return result === 0 ? 0 : result;
}

export function clampPitch(
  value: number,
  minUnits: number = DEFAULT_MIN_PITCH_UNITS,
  maxUnits: number = DEFAULT_MAX_PITCH_UNITS,
): AngleUnits {
  const clamped = clampInt(value, minUnits, maxUnits);
  return clamped as AngleUnits;
}

/**
 * Deterministic fixed-point arithmetic using JS Numbers restricted to Safe Integers.
 * 
 * We use a multiplier of 10000 (4 decimal places), which fits well within MAX_SAFE_INTEGER
 * for standard 2D physics coordinates (1920x1080 -> 19200000x10800000).
 * MAX_SAFE_INTEGER is ~9x10^15, which allows squaring coordinate distances up to
 * ~90000 (which is 9 pixels at 10000 scale). So for large distance checks we must
 * be careful, but 10000 multiplier handles the simulation positions deterministically.
 */

export const FIXED_MULT = 10000;
export const MAX_COORD = 100000 * FIXED_MULT; // 1 billion
export const MIN_COORD = -MAX_COORD;

export function checkFixed(val: number): number {
  if (!Number.isSafeInteger(val)) {
    throw new RangeError(`Value ${val} is not a safe integer`);
  }
  return val;
}

export function toFixed(val: number): number {
  return checkFixed(Math.round(val * FIXED_MULT));
}

export function toFloat(val: number): number {
  return checkFixed(val) / FIXED_MULT;
}

/**
 * Calculates squared distance between two fixed-point 2D points.
 * Returns BigInt to avoid safe integer overflow during squaring of large coordinates.
 */
export function distSqBigInt(x1: number, y1: number, x2: number, y2: number): bigint {
  const dx = BigInt(checkFixed(x2)) - BigInt(checkFixed(x1));
  const dy = BigInt(checkFixed(y2)) - BigInt(checkFixed(y1));
  return dx * dx + dy * dy;
}

