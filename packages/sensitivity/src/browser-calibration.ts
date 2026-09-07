/**
 * Browser input calibration.
 *
 * The cross-game converter in `converter.ts` is physically exact: it maps a
 * game's displayed sensitivity onto the canonical Aimlabs Default / FindMySensi
 * scale through degrees-per-raw-count, and that canonical value is correct
 * cm/360 for a native application.
 *
 * FindMySensi is not a native application. It reads mouse motion from browser
 * Pointer Lock `movementX` / `movementY`, and the web platform does not
 * guarantee that one of those units equals one hardware mouse count -- MDN
 * states the unit differs by browser and operating system. So the value a
 * player must actually type into FindMySensi to reproduce their in-game turn
 * can differ from the canonical value by a constant per-platform factor.
 *
 * This module is that factor and nothing more. It never changes the converter
 * constants (Valorant 0.07, CS2 0.022, Apex 0.022, Aimlabs Default 0.05) and
 * never changes cm/360 physics. It only scales the final "type this into
 * FindMySensi" number.
 *
 * The default 1.4 is 0.245 / 0.175: measured on Chrome + Windows by matching a
 * physical 360 turn in Valorant 0.125 (= Aimlabs Default 0.175) against
 * FindMySensi. Set the scale to 1 to disable it, and canonical == typed value.
 */

export interface BrowserInputCalibration {
  readonly version: 1;
  readonly scale: number;
  readonly source: "default" | "measured" | "verified-native";
}

/** 0.245 / 0.175, measured on Chrome + Windows. */
export const DEFAULT_BROWSER_INPUT_CALIBRATION_SCALE = 1.4;

/** Lowest and highest factor we will accept before treating input as corrupt. */
export const MIN_BROWSER_INPUT_CALIBRATION_SCALE = 0.25;
export const MAX_BROWSER_INPUT_CALIBRATION_SCALE = 4;

export const DEFAULT_BROWSER_INPUT_CALIBRATION: BrowserInputCalibration =
  Object.freeze({
    version: 1,
    scale: DEFAULT_BROWSER_INPUT_CALIBRATION_SCALE,
    source: "default",
  });

/** A calibration that changes nothing: canonical value is used as typed. */
export const IDENTITY_BROWSER_INPUT_CALIBRATION: BrowserInputCalibration =
  Object.freeze({ version: 1, scale: 1, source: "verified-native" });

export type BrowserInputCalibrationInput =
  | BrowserInputCalibration
  | Partial<BrowserInputCalibration>
  | number
  | null
  | undefined;

function assertUsableScale(scale: number): void {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError(
      "Browser input calibration scale must be a positive finite number.",
    );
  }
  if (
    scale < MIN_BROWSER_INPUT_CALIBRATION_SCALE ||
    scale > MAX_BROWSER_INPUT_CALIBRATION_SCALE
  ) {
    throw new RangeError(
      `Browser input calibration scale must be between ${MIN_BROWSER_INPUT_CALIBRATION_SCALE} and ${MAX_BROWSER_INPUT_CALIBRATION_SCALE}.`,
    );
  }
}

/**
 * Normalises loose input (a bare number, a partial object, null) into a
 * complete, validated calibration. `null` / `undefined` yields the default.
 */
export function resolveBrowserInputCalibration(
  input?: BrowserInputCalibrationInput,
): BrowserInputCalibration {
  if (input === null || input === undefined) {
    return DEFAULT_BROWSER_INPUT_CALIBRATION;
  }
  if (typeof input === "number") {
    assertUsableScale(input);
    return Object.freeze({ version: 1, scale: input, source: "measured" });
  }
  const scale = input.scale ?? DEFAULT_BROWSER_INPUT_CALIBRATION_SCALE;
  assertUsableScale(scale);
  return Object.freeze({
    version: 1,
    scale,
    source: input.source ?? "measured",
  });
}

/**
 * Applies the calibration to a canonical FindMySensi sensitivity and returns
 * the value the player should type into FindMySensi. Rounds to 6 decimals so
 * the result is a clean, re-enterable number.
 */
export function applyBrowserInputCalibration(
  canonicalFmsSensitivity: number,
  calibration: BrowserInputCalibrationInput = DEFAULT_BROWSER_INPUT_CALIBRATION,
): number {
  if (
    !Number.isFinite(canonicalFmsSensitivity) ||
    canonicalFmsSensitivity <= 0
  ) {
    throw new RangeError(
      "Canonical FindMySensi sensitivity must be a positive finite number.",
    );
  }
  const resolved = resolveBrowserInputCalibration(calibration);
  const calibrated = canonicalFmsSensitivity * resolved.scale;
  return Number(calibrated.toFixed(6));
}

/** Inverse of {@link applyBrowserInputCalibration}. */
export function removeBrowserInputCalibration(
  typedFmsSensitivity: number,
  calibration: BrowserInputCalibrationInput = DEFAULT_BROWSER_INPUT_CALIBRATION,
): number {
  if (!Number.isFinite(typedFmsSensitivity) || typedFmsSensitivity <= 0) {
    throw new RangeError(
      "Typed FindMySensi sensitivity must be a positive finite number.",
    );
  }
  const resolved = resolveBrowserInputCalibration(calibration);
  return Number((typedFmsSensitivity / resolved.scale).toFixed(6));
}
