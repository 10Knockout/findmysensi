export interface MouseProfile {
  readonly name: string;
  readonly dpi: number;
  readonly sensorModel?: string;
  readonly weightGrams?: number;
}

export interface MouseSwapResult {
  readonly originalSens: number;
  readonly adjustedSens: number;
  readonly dpiScalingFactor: number;
  readonly explanation: string;
}

export function calculateMouseSwap(
  originalSens: number,
  oldMouse: MouseProfile,
  newMouse: MouseProfile,
): MouseSwapResult {
  if (originalSens <= 0 || oldMouse.dpi <= 0 || newMouse.dpi <= 0) {
    throw new RangeError("Sensitivity and DPI values must be positive.");
  }

  const dpiScalingFactor = oldMouse.dpi / newMouse.dpi;
  const adjustedSens = originalSens * dpiScalingFactor;

  return {
    originalSens,
    adjustedSens,
    dpiScalingFactor,
    explanation: `To match your physical distance from ${oldMouse.name} (${oldMouse.dpi} DPI) on ${newMouse.name} (${newMouse.dpi} DPI), set in-game sensitivity to ${adjustedSens.toFixed(4)}.`,
  };
}
