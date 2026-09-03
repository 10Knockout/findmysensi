import { Decimal, DecimalInput } from "./types.js";

function greatestCommonDivisor(a: bigint, b: bigint): bigint {
  let left = a < 0n ? -a : a;
  let right = b < 0n ? -b : b;
  while (right !== 0n) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left === 0n ? 1n : left;
}

export function createDecimal(
  numerator: bigint,
  denominator: bigint = 1n,
): Decimal {
  if (denominator === 0n) {
    throw new RangeError("Decimal denominator cannot be zero.");
  }

  const sign = denominator < 0n ? -1n : 1n;
  const signedNumerator = numerator * sign;
  const positiveDenominator = denominator * sign;
  const divisor = greatestCommonDivisor(signedNumerator, positiveDenominator);

  return Object.freeze({
    numerator: signedNumerator / divisor,
    denominator: positiveDenominator / divisor,
  });
}

function decimalStringToRatio(value: string): Decimal {
  const normalized = value.trim();
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(
    normalized,
  );
  if (!match) {
    throw new RangeError(`Invalid decimal value: ${value}`);
  }

  const sign = match[1] === "-" ? -1n : 1n;
  const whole = match[2] ?? "0";
  const fraction = match[3] ?? "";
  const exponent = Number(match[4] ?? "0");
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1_000) {
    throw new RangeError(
      `Decimal exponent is outside the supported range: ${value}`,
    );
  }

  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "") || "0";
  const scale = fraction.length - exponent;
  if (scale >= 0) {
    return createDecimal(sign * BigInt(digits), 10n ** BigInt(scale));
  }
  return createDecimal(sign * BigInt(digits) * 10n ** BigInt(-scale));
}

export function decimalFrom(value: DecimalInput): Decimal {
  if (typeof value === "object") {
    return createDecimal(value.numerator, value.denominator);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new RangeError("Decimal value must be finite.");
    }
    return decimalStringToRatio(value.toString());
  }
  return decimalStringToRatio(value);
}

export function multiplyDecimal(left: Decimal, right: Decimal): Decimal {
  return createDecimal(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
}

export function divideDecimal(left: Decimal, right: Decimal): Decimal {
  if (right.numerator === 0n) {
    throw new RangeError("Cannot divide by zero.");
  }
  return createDecimal(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
}

export function compareDecimal(left: Decimal, right: Decimal): number {
  const difference =
    left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

export function decimalToNumber(value: Decimal): number {
  const result = Number(value.numerator) / Number(value.denominator);
  if (!Number.isFinite(result)) {
    throw new RangeError("Decimal value is outside the finite Number range.");
  }
  return result;
}

export function formatDecimal(
  value: Decimal,
  maximumFractionDigits: number = 8,
): string {
  if (
    !Number.isSafeInteger(maximumFractionDigits) ||
    maximumFractionDigits < 0 ||
    maximumFractionDigits > 32
  ) {
    throw new RangeError(
      "maximumFractionDigits must be an integer from 0 to 32.",
    );
  }

  const negative = value.numerator < 0n;
  const absoluteNumerator = negative ? -value.numerator : value.numerator;
  const scale = 10n ** BigInt(maximumFractionDigits);
  const scaledNumerator = absoluteNumerator * scale;
  const rounded =
    (scaledNumerator + value.denominator / 2n) / value.denominator;
  const digits = rounded.toString().padStart(maximumFractionDigits + 1, "0");

  if (maximumFractionDigits === 0) {
    return `${negative ? "-" : ""}${digits}`;
  }

  const whole = digits.slice(0, -maximumFractionDigits) || "0";
  const fraction = digits.slice(-maximumFractionDigits).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}
