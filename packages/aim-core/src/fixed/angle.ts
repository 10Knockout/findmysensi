export const FULL_TURN_UNITS = 1 << 24; // 16,777,216 units per 360 deg
export const HALF_TURN_UNITS = FULL_TURN_UNITS >> 1; // 8,388,608 units per 180 deg
export const QUARTER_TURN_UNITS = FULL_TURN_UNITS >> 2; // 4,194,304 units per 90 deg
export const FULL_TURN_MASK = FULL_TURN_UNITS - 1; // 0x00FFFFFF

export type AngleUnits = number & { readonly __brand: "AngleUnits" };
export type AngleDeltaUnits = number & { readonly __brand: "AngleDeltaUnits" };

export function createAngleUnits(value: number): AngleUnits {
  if (!Number.isSafeInteger(value) || value < 0 || value >= FULL_TURN_UNITS) {
    throw new RangeError(
      `Invalid AngleUnits: ${value}. Must be an integer in [0, ${FULL_TURN_UNITS - 1}].`,
    );
  }
  return (value === 0 ? 0 : value) as AngleUnits;
}

export function createAngleDeltaUnits(value: number): AngleDeltaUnits {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `Invalid AngleDeltaUnits: ${value}. Must be a safe integer.`,
    );
  }
  return (value === 0 ? 0 : value) as AngleDeltaUnits;
}

export function wrapYaw(value: number): AngleUnits {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `Invalid angle value for wrapYaw: ${value}. Must be a safe integer.`,
    );
  }
  const remainder = value % FULL_TURN_UNITS;
  const wrapped = remainder < 0 ? remainder + FULL_TURN_UNITS : remainder;
  return (wrapped === 0 ? 0 : wrapped) as AngleUnits;
}

export function addAngle(base: AngleUnits, delta: AngleDeltaUnits): AngleUnits {
  if (!Number.isSafeInteger(base) || !Number.isSafeInteger(delta)) {
    throw new RangeError(
      `Invalid inputs to addAngle: base=${base}, delta=${delta}.`,
    );
  }
  return wrapYaw(base + delta);
}

// Presentation conversions (Renderers and UX only)
export function degreesToAngleUnits(deg: number): AngleUnits {
  if (!Number.isFinite(deg)) {
    throw new RangeError(`Invalid degrees: ${deg}. Must be a finite number.`);
  }
  const units = Math.round((deg / 360) * FULL_TURN_UNITS);
  return wrapYaw(units);
}

export function angleUnitsToDegrees(units: AngleUnits): number {
  return (units / FULL_TURN_UNITS) * 360;
}

export function degreesToAngleDeltaUnits(deg: number): AngleDeltaUnits {
  if (!Number.isFinite(deg)) {
    throw new RangeError(
      `Invalid degree delta: ${deg}. Must be a finite number.`,
    );
  }
  const units = Math.round((deg / 360) * FULL_TURN_UNITS);
  return createAngleDeltaUnits(units);
}

export function angleDeltaUnitsToDegrees(units: AngleDeltaUnits): number {
  return (units / FULL_TURN_UNITS) * 360;
}
