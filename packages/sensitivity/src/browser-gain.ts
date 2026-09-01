export const DEFAULT_FMS_SENSITIVITY = "1";
export const BASE_BROWSER_GAIN_ANGLE_UNITS = 2_500;

export type BrowserGainAngleUnitsPerInputUnit = number & {
  readonly __brand: "BrowserGainAngleUnitsPerInputUnit";
};

interface DecimalRatio {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

function parsePositiveDecimal(value: string): DecimalRatio {
  const normalized = value.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match) {
    throw new RangeError(`Invalid FindMySensi sensitivity: ${value}`);
  }

  const whole = match[1] ?? "0";
  const fraction = match[2] ?? "";
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(`${whole}${fraction}` || "0");

  if (numerator <= 0n) {
    throw new RangeError("FindMySensi sensitivity must be greater than zero.");
  }

  return { numerator, denominator };
}

function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

export function resolveBrowserGainAngleUnits(
  fmsSensitivity: string | null,
): BrowserGainAngleUnitsPerInputUnit {
  const ratio = parsePositiveDecimal(
    fmsSensitivity ?? DEFAULT_FMS_SENSITIVITY,
  );
  const resolved = divideRoundHalfUp(
    BigInt(BASE_BROWSER_GAIN_ANGLE_UNITS) * ratio.numerator,
    ratio.denominator,
  );

  if (resolved <= 0n || resolved > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Resolved browser input gain is outside the safe range.");
  }

  return Number(resolved) as BrowserGainAngleUnitsPerInputUnit;
}
