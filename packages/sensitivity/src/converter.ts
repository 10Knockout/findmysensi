import {
  createDecimal,
  decimalFrom,
  decimalToNumber,
  divideDecimal,
  formatDecimal,
  multiplyDecimal,
} from "./decimal.js";
import { getSensitivityProfile } from "./games.js";
import {
  AngularGain,
  ConversionContext,
  Decimal,
  DecimalInput,
  SensitivityConversionRequest,
  SensitivityConversionResult,
  SupportedGameId,
} from "./types.js";

const DEGREES_PER_TURN = createDecimal(360n);
const CENTIMETERS_PER_INCH = createDecimal(254n, 100n);
export const FMS_BASE_DEGREES_PER_COUNT = 0.05;
export const FMS_NATIVE_PROFILE_ID = "aimlab-default" as const;

function conversionContext(dpi: number): ConversionContext {
  if (!Number.isFinite(dpi) || dpi <= 0) {
    throw new RangeError("DPI must be a positive finite number.");
  }
  return { dpi, aimMode: "hipfire" };
}

function asAngularGain(value: Decimal): AngularGain {
  return Object.freeze({
    ...value,
    unit: "degrees-per-raw-count" as const,
  });
}

function physicalDistanceForGain(
  gain: AngularGain,
  dpi: Decimal,
): { countsPer360: Decimal; inchesPer360: Decimal; cmPer360: Decimal } {
  const countsPer360 = divideDecimal(DEGREES_PER_TURN, gain);
  const inchesPer360 = divideDecimal(countsPer360, dpi);
  const cmPer360 = multiplyDecimal(inchesPer360, CENTIMETERS_PER_INCH);
  return { countsPer360, inchesPer360, cmPer360 };
}

/** Calculates physical cm/360 from a profile's canonical angular gain. */
export function sensitivityToCmPer360(
  gameId: SupportedGameId,
  sensitivity: DecimalInput,
  dpi: number = 800,
): number {
  const context = conversionContext(dpi);
  const profile = getSensitivityProfile(gameId);
  const gain = profile.sensitivityToAngularGain(
    decimalFrom(sensitivity),
    context,
  );
  return decimalToNumber(
    physicalDistanceForGain(gain, decimalFrom(dpi)).cmPer360,
  );
}

/** Converts a physical cm/360 distance to a profile sensitivity. */
export function cmPer360ToSensitivity(
  gameId: SupportedGameId,
  cmPer360: DecimalInput,
  dpi: number = 800,
): number {
  const context = conversionContext(dpi);
  const distance = decimalFrom(cmPer360);
  if (distance.numerator <= 0n) {
    throw new RangeError("cm/360 distance must be a positive finite number.");
  }

  const inchesPer360 = divideDecimal(distance, CENTIMETERS_PER_INCH);
  const countsPer360 = multiplyDecimal(inchesPer360, decimalFrom(dpi));
  const gain = asAngularGain(divideDecimal(DEGREES_PER_TURN, countsPer360));
  const sensitivity = getSensitivityProfile(gameId).angularGainToSensitivity(
    gain,
    context,
  );
  return decimalToNumber(sensitivity);
}

/**
 * Converts between versioned game profiles through degrees per raw count.
 * DPI participates only in physical-speed matching; FOV does not.
 */
export function convertSensitivity(
  req: SensitivityConversionRequest,
): SensitivityConversionResult {
  const sourceDpi = req.sourceDpi ?? 800;
  const targetDpi = req.targetDpi ?? sourceDpi;
  const sourceContext = conversionContext(sourceDpi);
  const targetContext = conversionContext(targetDpi);
  const sourceProfile = getSensitivityProfile(req.sourceGame);
  const targetProfile = getSensitivityProfile(req.targetGame);
  const sourceSensitivity = decimalFrom(req.sourceSensitivity);
  const sourceGain = sourceProfile.sensitivityToAngularGain(
    sourceSensitivity,
    sourceContext,
  );

  const sourceDpiDecimal = decimalFrom(sourceDpi);
  const targetDpiDecimal = decimalFrom(targetDpi);
  const physicalDegreesPerInch = multiplyDecimal(sourceGain, sourceDpiDecimal);
  const targetGain = asAngularGain(
    divideDecimal(physicalDegreesPerInch, targetDpiDecimal),
  );
  const exactTargetSensitivity = targetProfile.angularGainToSensitivity(
    targetGain,
    targetContext,
  );

  const physical = physicalDistanceForGain(sourceGain, sourceDpiDecimal);
  const targetSensitivity = decimalToNumber(exactTargetSensitivity);
  const sourceSensitivityNumber = decimalToNumber(sourceSensitivity);

  return {
    targetSensitivity,
    exactTargetSensitivity,
    cmPer360: decimalToNumber(physical.cmPer360),
    inPer360: decimalToNumber(physical.inchesPer360),
    countsPer360: decimalToNumber(physical.countsPer360),
    yawDegreesPerCount: decimalToNumber(targetGain),
    sourceEdpi: sourceSensitivityNumber * sourceDpi,
    targetEdpi: targetSensitivity * targetDpi,
    formattedTargetSensitivity: formatDecimal(exactTargetSensitivity, 8),
    formattedCmPer360: formatDecimal(physical.cmPer360, 2),
    formattedInPer360: formatDecimal(physical.inchesPer360, 2),
  };
}

/** Converts a game profile value onto the native Aimlabs Default/FMS scale. */
export function gameSensitivityToFms(
  gameId: SupportedGameId,
  sensitivity: DecimalInput,
): string {
  const converted = convertSensitivity({
    sourceGame: gameId,
    targetGame: FMS_NATIVE_PROFILE_ID,
    sourceSensitivity: sensitivity,
    sourceDpi: 800,
    targetDpi: 800,
  });
  return formatDecimal(converted.exactTargetSensitivity, 12);
}

/** Converts a native FMS/Aimlabs Default value to another game profile. */
export function fmsToGameSensitivity(
  gameId: SupportedGameId,
  fmsSensitivity: DecimalInput,
): number {
  return convertSensitivity({
    sourceGame: FMS_NATIVE_PROFILE_ID,
    targetGame: gameId,
    sourceSensitivity: fmsSensitivity,
    sourceDpi: 800,
    targetDpi: 800,
  }).targetSensitivity;
}

/** FMS intentionally uses the Aimlabs Default numeric scale with no factor. */
export function aimlabsDefaultToFindMySensi(sensitivity: DecimalInput): number {
  const parsed = decimalFrom(sensitivity);
  getSensitivityProfile(FMS_NATIVE_PROFILE_ID).validate(
    parsed,
    conversionContext(800),
  );
  return decimalToNumber(parsed);
}

/** FMS intentionally uses the Aimlabs Default numeric scale with no factor. */
export const findMySensiToAimlabsDefault = aimlabsDefaultToFindMySensi;
