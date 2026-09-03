import { z } from "zod";

export type SupportedGameId =
  | "cs2"
  | "valorant"
  | "apex"
  | "aimlab"
  | "pubg"
  | "overwatch2"
  | "fortnite"
  | "r6siege"
  | "quake"
  | "unreal";

export const SupportedGameIdSchema = z.enum([
  "cs2",
  "valorant",
  "apex",
  "aimlab",
  "pubg",
  "overwatch2",
  "fortnite",
  "r6siege",
  "quake",
  "unreal",
]);

export interface GameAdapter {
  readonly id: SupportedGameId;
  readonly name: string;
  readonly defaultYawDegrees: number;
  readonly defaultDpi: number;
  readonly minSensitivity: number;
  readonly maxSensitivity: number;
  readonly defaultFovDegrees: number;
}

export interface SensitivityConversionRequest {
  readonly sourceGame: SupportedGameId;
  readonly targetGame: SupportedGameId;
  readonly sourceSensitivity: number;
  readonly sourceDpi?: number;
  readonly targetDpi?: number;
}

export interface SensitivityConversionResult {
  readonly targetSensitivity: number;
  readonly cmPer360: number;
  readonly inPer360: number;
  readonly yawDegreesPerCount: number;
  readonly formattedTargetSensitivity: string;
  readonly formattedCmPer360: string;
}
