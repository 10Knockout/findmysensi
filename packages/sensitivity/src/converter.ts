import { getGameAdapter } from "./games.js";
import {
  SensitivityConversionRequest,
  SensitivityConversionResult,
  SupportedGameId,
} from "./types.js";

const INCHES_PER_CM = 0.3937007874;

/**
 * Calculates physical cm/360 turn distance given in-game sensitivity, DPI, and game yaw multiplier.
 */
export function sensitivityToCmPer360(
  gameId: SupportedGameId,
  sensitivity: number,
  dpi: number = 800,
): number {
  if (sensitivity <= 0 || !Number.isFinite(sensitivity)) {
    throw new RangeError("Sensitivity must be a positive finite number.");
  }
  if (dpi <= 0 || !Number.isFinite(dpi)) {
    throw new RangeError("DPI must be a positive finite number.");
  }

  const adapter = getGameAdapter(gameId);
  const yawDegreesPerCount = adapter.defaultYawDegrees * sensitivity;
  const countsPer360 = 360 / yawDegreesPerCount;
  const inchesPer360 = countsPer360 / dpi;
  const cmPer360 = inchesPer360 / INCHES_PER_CM;

  return cmPer360;
}

/**
 * Converts physical cm/360 turn distance to in-game sensitivity for a specific game and DPI.
 */
export function cmPer360ToSensitivity(
  gameId: SupportedGameId,
  cmPer360: number,
  dpi: number = 800,
): number {
  if (cmPer360 <= 0 || !Number.isFinite(cmPer360)) {
    throw new RangeError("cm/360 distance must be a positive finite number.");
  }
  if (dpi <= 0 || !Number.isFinite(dpi)) {
    throw new RangeError("DPI must be a positive finite number.");
  }

  const adapter = getGameAdapter(gameId);
  const inchesPer360 = cmPer360 * INCHES_PER_CM;
  const countsPer360 = inchesPer360 * dpi;
  const yawDegreesPerCount = 360 / countsPer360;
  const sensitivity = yawDegreesPerCount / adapter.defaultYawDegrees;

  return sensitivity;
}

/**
 * Performs accurate cross-game sensitivity conversion, accounting for differing DPIs if specified.
 */
export function convertSensitivity(
  req: SensitivityConversionRequest,
): SensitivityConversionResult {
  const sourceDpi = req.sourceDpi ?? 800;
  const targetDpi = req.targetDpi ?? sourceDpi;

  const cmPer360 = sensitivityToCmPer360(
    req.sourceGame,
    req.sourceSensitivity,
    sourceDpi,
  );

  const targetSensitivity = cmPer360ToSensitivity(
    req.targetGame,
    cmPer360,
    targetDpi,
  );

  const targetAdapter = getGameAdapter(req.targetGame);
  const yawDegreesPerCount =
    targetAdapter.defaultYawDegrees * targetSensitivity;
  const inPer360 = cmPer360 * INCHES_PER_CM;

  return {
    targetSensitivity,
    cmPer360,
    inPer360,
    yawDegreesPerCount,
    formattedTargetSensitivity: targetSensitivity.toFixed(4),
    formattedCmPer360: cmPer360.toFixed(2),
  };
}
