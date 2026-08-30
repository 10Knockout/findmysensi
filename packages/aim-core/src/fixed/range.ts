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
