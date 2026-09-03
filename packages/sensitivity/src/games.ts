import {
  compareDecimal,
  createDecimal,
  decimalFrom,
  divideDecimal,
  multiplyDecimal,
} from "./decimal.js";
import {
  AngularGain,
  ConversionContext,
  Decimal,
  SensitivityProfile,
  SupportedGameId,
} from "./types.js";

interface LinearProfileOptions {
  readonly id: SupportedGameId;
  readonly name: string;
  readonly version: number;
  readonly yawDegrees: string;
  readonly defaultDpi?: number;
  readonly minSensitivity: number;
  readonly maxSensitivity: number;
  readonly defaultFovDegrees: number;
}

function assertPositiveDpi(context: ConversionContext): void {
  if (!Number.isFinite(context.dpi) || context.dpi <= 0) {
    throw new RangeError("DPI must be a positive finite number.");
  }
}

export function createLinearSensitivityProfile(
  options: LinearProfileOptions,
): SensitivityProfile {
  const yaw = decimalFrom(options.yawDegrees);
  const minimum = decimalFrom(options.minSensitivity);
  const maximum = decimalFrom(options.maxSensitivity);

  const validate = (sensitivity: Decimal, context: ConversionContext) => {
    assertPositiveDpi(context);
    if (
      compareDecimal(sensitivity, minimum) < 0 ||
      compareDecimal(sensitivity, maximum) > 0
    ) {
      throw new RangeError(
        `${options.name} sensitivity must be between ${options.minSensitivity} and ${options.maxSensitivity}.`,
      );
    }
  };

  return Object.freeze({
    ...options,
    verificationLevel: "cross-verified" as const,
    conversionAvailability: "available" as const,
    defaultDpi: options.defaultDpi ?? 800,
    validate,
    sensitivityToAngularGain(
      sensitivity: Decimal,
      context: ConversionContext,
    ): AngularGain {
      validate(sensitivity, context);
      const gain = multiplyDecimal(sensitivity, yaw);
      return Object.freeze({
        ...gain,
        unit: "degrees-per-raw-count" as const,
      });
    },
    angularGainToSensitivity(
      gain: AngularGain,
      context: ConversionContext,
    ): Decimal {
      const sensitivity = divideDecimal(gain, yaw);
      validate(sensitivity, context);
      return sensitivity;
    },
  });
}

interface ResearchRequiredProfileOptions {
  readonly id: SupportedGameId;
  readonly name: string;
  readonly version: number;
  readonly defaultDpi?: number;
  readonly minSensitivity: number;
  readonly maxSensitivity: number;
  readonly defaultFovDegrees: number;
}

function createResearchRequiredProfile(
  options: ResearchRequiredProfileOptions,
): SensitivityProfile {
  const unavailable = (): never => {
    throw new Error(
      `${options.name} conversion is experimental and unavailable until its current sensitivity curve is cross-verified.`,
    );
  };

  return Object.freeze({
    ...options,
    verificationLevel: "experimental" as const,
    conversionAvailability: "research-required" as const,
    defaultDpi: options.defaultDpi ?? 800,
    validate(sensitivity: Decimal, context: ConversionContext): void {
      assertPositiveDpi(context);
      if (compareDecimal(sensitivity, createDecimal(0n)) <= 0) {
        throw new RangeError("Sensitivity must be greater than zero.");
      }
    },
    sensitivityToAngularGain: unavailable,
    angularGainToSensitivity: unavailable,
  });
}

export const SENSITIVITY_PROFILES: Record<SupportedGameId, SensitivityProfile> =
  {
    cs2: createLinearSensitivityProfile({
      id: "cs2",
      name: "Counter-Strike 2",
      version: 1,
      yawDegrees: "0.022",
      minSensitivity: 0.01,
      maxSensitivity: 30,
      defaultFovDegrees: 90,
    }),
    valorant: createLinearSensitivityProfile({
      id: "valorant",
      name: "Valorant",
      version: 1,
      yawDegrees: "0.07",
      minSensitivity: 0.01,
      maxSensitivity: 10,
      defaultFovDegrees: 103,
    }),
    apex: createLinearSensitivityProfile({
      id: "apex",
      name: "Apex Legends",
      version: 1,
      yawDegrees: "0.022",
      minSensitivity: 0.01,
      maxSensitivity: 30,
      defaultFovDegrees: 90,
    }),
    "aimlab-default": createLinearSensitivityProfile({
      id: "aimlab-default",
      name: "Aimlabs Default",
      version: 1,
      yawDegrees: "0.05",
      minSensitivity: 0.001,
      maxSensitivity: 100,
      defaultFovDegrees: 103,
    }),
    pubg: createResearchRequiredProfile({
      id: "pubg",
      name: "PUBG: BATTLEGROUNDS",
      version: 1,
      minSensitivity: 0,
      maxSensitivity: 100,
      defaultFovDegrees: 90,
    }),
    overwatch2: createResearchRequiredProfile({
      id: "overwatch2",
      name: "Overwatch 2",
      version: 1,
      minSensitivity: 0.01,
      maxSensitivity: 100,
      defaultFovDegrees: 103,
    }),
    fortnite: createResearchRequiredProfile({
      id: "fortnite",
      name: "Fortnite",
      version: 1,
      minSensitivity: 0.01,
      maxSensitivity: 100,
      defaultFovDegrees: 80,
    }),
    r6siege: createResearchRequiredProfile({
      id: "r6siege",
      name: "Rainbow Six Siege",
      version: 1,
      minSensitivity: 1,
      maxSensitivity: 100,
      defaultFovDegrees: 90,
    }),
    quake: createResearchRequiredProfile({
      id: "quake",
      name: "Quake",
      version: 1,
      minSensitivity: 0.01,
      maxSensitivity: 30,
      defaultFovDegrees: 90,
    }),
    unreal: createResearchRequiredProfile({
      id: "unreal",
      name: "Unreal Engine profile",
      version: 1,
      minSensitivity: 0.001,
      maxSensitivity: 50,
      defaultFovDegrees: 90,
    }),
  };

export const VERIFIED_SENSITIVITY_PROFILE_IDS = [
  "valorant",
  "cs2",
  "apex",
  "aimlab-default",
] as const satisfies readonly SupportedGameId[];

export type VerifiedSensitivityProfileId =
  (typeof VERIFIED_SENSITIVITY_PROFILE_IDS)[number];

export function isVerifiedSensitivityProfileId(
  value: string,
): value is VerifiedSensitivityProfileId {
  return (VERIFIED_SENSITIVITY_PROFILE_IDS as readonly string[]).includes(
    value,
  );
}

export function normalizeSensitivityProfileId(
  value: string,
): SupportedGameId | null {
  const migrated = value === "aimlab" ? "aimlab-default" : value;
  return migrated in SENSITIVITY_PROFILES
    ? (migrated as SupportedGameId)
    : null;
}

export function getSensitivityProfile(
  gameId: SupportedGameId,
): SensitivityProfile {
  const profile = SENSITIVITY_PROFILES[gameId];
  if (!profile) {
    throw new Error(`Unsupported game identifier: ${gameId}`);
  }
  return profile;
}
