import { FULL_TURN_UNITS } from "@findmysensi/aim-core";
import {
  createDecimal,
  decimalFrom,
  decimalToNumber,
  multiplyDecimal,
} from "./decimal.js";

export const DEFAULT_FMS_SENSITIVITY = "1";
export const FMS_DEGREES_PER_RAW_COUNT_AT_SENSITIVITY_ONE = 0.05;
export const BROWSER_GAIN_FRACTION_BITS = 20 as const;
export const BROWSER_GAIN_FIXED_POINT_SCALE = 1 << BROWSER_GAIN_FRACTION_BITS;

const FMS_BASE_DEGREES_NUMERATOR = 5n;
const FMS_BASE_DEGREES_DENOMINATOR = 100n;
const DEGREES_PER_TURN = 360n;
const FIXED_POINT_SCALE = BigInt(BROWSER_GAIN_FIXED_POINT_SCALE);

export interface BrowserInputGain {
  readonly fixedPointAngleUnitsPerInputUnit: number;
  readonly fractionBits: typeof BROWSER_GAIN_FRACTION_BITS;
  readonly fixedPointScale: typeof BROWSER_GAIN_FIXED_POINT_SCALE;
  readonly degreesPerInputUnit: number;
  readonly fmsSensitivity: string;
}

function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

export function resolveBrowserInputGain(
  fmsSensitivity: string | null,
): BrowserInputGain {
  const sensitivityText = fmsSensitivity ?? DEFAULT_FMS_SENSITIVITY;
  const sensitivity = decimalFrom(sensitivityText);
  if (sensitivity.numerator <= 0n) {
    throw new RangeError("FindMySensi sensitivity must be greater than zero.");
  }

  const fixedPointGain = divideRoundHalfUp(
    BigInt(FULL_TURN_UNITS) *
      FMS_BASE_DEGREES_NUMERATOR *
      sensitivity.numerator *
      FIXED_POINT_SCALE,
    DEGREES_PER_TURN * FMS_BASE_DEGREES_DENOMINATOR * sensitivity.denominator,
  );

  if (
    fixedPointGain <= 0n ||
    fixedPointGain > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new RangeError(
      "Resolved browser input gain is outside the safe range.",
    );
  }

  const degreesPerInputUnit = decimalToNumber(
    multiplyDecimal(
      sensitivity,
      createDecimal(FMS_BASE_DEGREES_NUMERATOR, FMS_BASE_DEGREES_DENOMINATOR),
    ),
  );
  if (!Number.isFinite(degreesPerInputUnit) || degreesPerInputUnit > 5) {
    throw new RangeError(
      "FindMySensi sensitivity exceeds the supported runtime range.",
    );
  }

  return Object.freeze({
    fixedPointAngleUnitsPerInputUnit: Number(fixedPointGain),
    fractionBits: BROWSER_GAIN_FRACTION_BITS,
    fixedPointScale: BROWSER_GAIN_FIXED_POINT_SCALE,
    degreesPerInputUnit,
    fmsSensitivity: sensitivityText,
  });
}

export const DEFAULT_BROWSER_INPUT_GAIN = resolveBrowserInputGain(null);

/**
 * Hot-loop scaler. It uses only safe integer Number arithmetic and retains a
 * separate signed fractional remainder for yaw and pitch.
 */
export class DeterministicBrowserInputScaler {
  private readonly wholeAngleUnitsPerInputUnit: number;
  private readonly fractionalAngleUnitsPerInputUnit: number;
  private yawResidual: number = 0;
  private pitchResidual: number = 0;

  constructor(private readonly gain: BrowserInputGain) {
    if (
      gain.fractionBits !== BROWSER_GAIN_FRACTION_BITS ||
      gain.fixedPointScale !== BROWSER_GAIN_FIXED_POINT_SCALE ||
      !Number.isSafeInteger(gain.fixedPointAngleUnitsPerInputUnit) ||
      gain.fixedPointAngleUnitsPerInputUnit <= 0
    ) {
      throw new RangeError("Browser input gain is not a valid Q20 value.");
    }

    this.wholeAngleUnitsPerInputUnit = Math.trunc(
      gain.fixedPointAngleUnitsPerInputUnit / gain.fixedPointScale,
    );
    this.fractionalAngleUnitsPerInputUnit =
      gain.fixedPointAngleUnitsPerInputUnit % gain.fixedPointScale;
  }

  public scaleYaw(rawDelta: number): number {
    const result = this.scale(rawDelta, this.yawResidual);
    this.yawResidual = result.residual;
    return result.angleUnits;
  }

  public scalePitch(rawDelta: number): number {
    const result = this.scale(rawDelta, this.pitchResidual);
    this.pitchResidual = result.residual;
    return result.angleUnits;
  }

  public reset(): void {
    this.yawResidual = 0;
    this.pitchResidual = 0;
  }

  public getResiduals(): Readonly<{ yaw: number; pitch: number }> {
    return Object.freeze({ yaw: this.yawResidual, pitch: this.pitchResidual });
  }

  public getGain(): BrowserInputGain {
    return this.gain;
  }

  private scale(
    rawDelta: number,
    residual: number,
  ): { angleUnits: number; residual: number } {
    if (!Number.isSafeInteger(rawDelta)) {
      throw new RangeError(
        `Raw browser movement must be a safe integer: ${rawDelta}`,
      );
    }

    const wholeDelta = rawDelta * this.wholeAngleUnitsPerInputUnit;
    const fractionalTotal =
      rawDelta * this.fractionalAngleUnitsPerInputUnit + residual;
    if (
      !Number.isSafeInteger(wholeDelta) ||
      !Number.isSafeInteger(fractionalTotal)
    ) {
      throw new RangeError(
        "Browser input delta exceeds safe integer precision.",
      );
    }

    const fractionalDelta = Math.trunc(
      fractionalTotal / BROWSER_GAIN_FIXED_POINT_SCALE,
    );
    const nextResidual =
      fractionalTotal - fractionalDelta * BROWSER_GAIN_FIXED_POINT_SCALE;
    const angleUnits = wholeDelta + fractionalDelta;
    if (!Number.isSafeInteger(angleUnits)) {
      throw new RangeError(
        "Scaled browser angle exceeds safe integer precision.",
      );
    }

    return { angleUnits, residual: nextResidual };
  }
}

export function createBrowserInputScaler(
  gain: BrowserInputGain,
): DeterministicBrowserInputScaler {
  return new DeterministicBrowserInputScaler(gain);
}
