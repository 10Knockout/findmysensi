import {
  type BrowserInputCalibrationInput,
  removeBrowserInputCalibration,
} from "./browser-calibration.js";
import { FMS_NATIVE_PROFILE_ID, convertSensitivity } from "./converter.js";
import type { SensitivityConversionResult, SupportedGameId } from "./types.js";

export interface RuntimeFmsConversion {
  readonly runtimeFmsSensitivity: number;
  readonly canonicalFmsSensitivity: number;
  readonly conversion: SensitivityConversionResult;
}

/** Removes browser calibration before converting a result to a native game. */
export function runtimeFmsToGameSensitivity(
  gameId: SupportedGameId,
  runtimeFmsSensitivity: number,
  dpi: number,
  calibration?: BrowserInputCalibrationInput,
): RuntimeFmsConversion {
  const canonicalFmsSensitivity = removeBrowserInputCalibration(
    runtimeFmsSensitivity,
    calibration,
  );
  const conversion = convertSensitivity({
    sourceGame: FMS_NATIVE_PROFILE_ID,
    targetGame: gameId,
    sourceSensitivity: canonicalFmsSensitivity,
    sourceDpi: dpi,
    targetDpi: dpi,
  });
  return Object.freeze({
    runtimeFmsSensitivity,
    canonicalFmsSensitivity,
    conversion,
  });
}
