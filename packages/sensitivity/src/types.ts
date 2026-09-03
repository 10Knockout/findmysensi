import { z } from "zod";

export const SUPPORTED_GAME_IDS = [
  "cs2",
  "valorant",
  "apex",
  "aimlab-default",
  "pubg",
  "overwatch2",
  "fortnite",
  "r6siege",
  "quake",
  "unreal",
] as const;

export type SupportedGameId = (typeof SUPPORTED_GAME_IDS)[number];

export const SupportedGameIdSchema = z.enum(SUPPORTED_GAME_IDS);

export type VerificationLevel = "official" | "cross-verified" | "experimental";

export type ConversionAvailability = "available" | "research-required";

export interface Decimal {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

export type DecimalInput = Decimal | number | string;

export interface AngularGain extends Decimal {
  readonly unit: "degrees-per-raw-count";
}

export interface ConversionContext {
  readonly dpi: number;
  readonly aimMode: "hipfire";
  readonly fovDegrees?: number;
}

/**
 * A versioned adapter between a game's displayed sensitivity and the
 * canonical angular quantity used for cross-game conversion.
 */
export interface SensitivityProfile {
  readonly id: SupportedGameId;
  readonly version: number;
  readonly name: string;
  readonly verificationLevel: VerificationLevel;
  readonly conversionAvailability: ConversionAvailability;
  readonly defaultDpi: number;
  readonly minSensitivity: number;
  readonly maxSensitivity: number;
  readonly defaultFovDegrees: number;

  sensitivityToAngularGain(
    sensitivity: Decimal,
    context: ConversionContext,
  ): AngularGain;

  angularGainToSensitivity(
    gain: AngularGain,
    context: ConversionContext,
  ): Decimal;

  validate(sensitivity: Decimal, context: ConversionContext): void;
}

export interface SensitivityConversionRequest {
  readonly sourceGame: SupportedGameId;
  readonly targetGame: SupportedGameId;
  readonly sourceSensitivity: DecimalInput;
  readonly sourceDpi?: number;
  readonly targetDpi?: number;
}

export interface SensitivityConversionResult {
  readonly targetSensitivity: number;
  readonly exactTargetSensitivity: Decimal;
  readonly cmPer360: number;
  readonly inPer360: number;
  readonly countsPer360: number;
  readonly yawDegreesPerCount: number;
  readonly sourceEdpi: number;
  readonly targetEdpi: number;
  readonly formattedTargetSensitivity: string;
  readonly formattedCmPer360: string;
  readonly formattedInPer360: string;
}
