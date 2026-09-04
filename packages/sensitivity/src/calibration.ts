export interface MouseSwapProfile {
  readonly name: string;
  readonly dpi: number;
}

export interface MouseSwapResult {
  readonly adjustedSens: number;
  readonly dpiScalingFactor: number;
}

/**
 * Simple, game-agnostic DPI swap: given a current sensitivity and the old
 * and new mouse DPI, returns the nominal equivalent that keeps the same
 * counts-per-360 (and therefore the same physical turning distance) for any
 * linear-response sensitivity curve. Deliberately minimal per product scope
 * -- no saved mouse profiles, no mouse hardware database, no timeline.
 */
export function calculateMouseSwap(
  currentSensitivity: number,
  oldMouse: MouseSwapProfile,
  newMouse: MouseSwapProfile,
): MouseSwapResult {
  if (
    !Number.isFinite(currentSensitivity) ||
    currentSensitivity <= 0 ||
    !Number.isFinite(oldMouse.dpi) ||
    oldMouse.dpi <= 0 ||
    !Number.isFinite(newMouse.dpi) ||
    newMouse.dpi <= 0
  ) {
    throw new RangeError(
      "Sensitivity and both DPI values must be positive finite numbers.",
    );
  }

  const dpiScalingFactor = oldMouse.dpi / newMouse.dpi;
  return {
    adjustedSens: currentSensitivity * dpiScalingFactor,
    dpiScalingFactor,
  };
}
