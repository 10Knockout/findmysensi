import { z } from "zod";

export const DEFAULT_TRAINING_FOV_DEGREES = 103;

/**
 * Widen a `#rgb`, `#RRGGBB`, or unprefixed hex string to a canonical
 * lowercase `#rrggbb`. Returns the input untouched when it is not a hex
 * colour so the schema below still reports a real validation error for
 * genuinely bad values. Older rows and hand-authored swatches used
 * 3-digit and uppercase forms; the API stores only `#rrggbb`, so a save
 * that carried one of those forms used to fail with a blunt, field-less
 * "Invalid trainer settings."
 */
export function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  const body = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (/^[0-9a-fA-F]{3}$/.test(body)) {
    return `#${body
      .split("")
      .map((char) => char + char)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(body)) {
    return `#${body.toLowerCase()}`;
  }
  return trimmed;
}

const HexColorField = z.preprocess(
  (value) => (typeof value === "string" ? normalizeHexColor(value) : value),
  z.string().regex(/^#[0-9a-f]{6}$/, "must be a #rrggbb hex colour"),
);

export const TrainerSettingsSchema = z
  .object({
    // One global Aimlabs Default numeric value. Every trainer mode uses it.
    // Source-game profiles belong to converter input and are never persisted.
    fmsSensitivity: z
      .string()
      .trim()
      .regex(/^\d+(?:\.\d+)?$/)
      .nullable()
      .default(null),
    nominalDpi: z
      .number()
      .int()
      .positive()
      .max(100_000)
      .nullable()
      .default(null),
    fovDegrees: z
      .number()
      .min(40)
      .max(140)
      .default(DEFAULT_TRAINING_FOV_DEGREES),
    targetColor: HexColorField.default("#7cff6b"),
    targetOpacity: z.number().min(0.2).max(1).default(1),
    targetOutline: z.boolean().default(false),
    crosshairCode: z.string().max(512).nullable().default(null),
    weaponHand: z.enum(["right", "left"]).default("right"),
    graphicsPreset: z
      .enum(["automatic", "potato", "low", "balanced", "high"])
      .default("automatic"),
    resolution: z
      .enum([
        "native",
        "2560x1440",
        "1920x1080",
        "1600x900",
        "1280x960",
        "1280x720",
        "custom",
      ])
      .default("native"),
    customResolutionWidth: z
      .number()
      .int()
      .min(640)
      .max(7680)
      .nullable()
      .default(null),
    customResolutionHeight: z
      .number()
      .int()
      .min(480)
      .max(4320)
      .nullable()
      .default(null),
    aspectRatio: z
      .enum(["16:9", "16:10", "4:3", "5:4", "custom"])
      .default("16:9"),
    scalingMode: z
      .enum(["fit", "stretch", "black-bars", "fill"])
      .default("fill"),
    // Deprecated: the trainer no longer exposes a polling-rate/input-processing
    // choice and always uses the safe, 8000 Hz-capable buffer internally.
    // Kept accepting legacy literal values only so old persisted settings
    // rows still parse; never read for runtime behavior.
    inputProcessing: z
      .union([
        z.literal("automatic"),
        z.literal("1000"),
        z.literal("2000"),
        z.literal("4000"),
        z.literal("8000"),
        z.literal("maximum"),
      ])
      .default("automatic"),
  })
  .strict();

export type TrainerSettings = z.infer<typeof TrainerSettingsSchema>;

const SETTINGS_FIELD_LABELS: Partial<Record<string, string>> = {
  fmsSensitivity: "Aim sensitivity",
  nominalDpi: "Mouse DPI",
  fovDegrees: "Field of view",
  targetColor: "Target colour",
  targetOpacity: "Target opacity",
  targetOutline: "Target outline",
  crosshairCode: "Crosshair",
  weaponHand: "Weapon hand",
  graphicsPreset: "Graphics preset",
  resolution: "Resolution",
  customResolutionWidth: "Custom width",
  customResolutionHeight: "Custom height",
  aspectRatio: "Aspect ratio",
  scalingMode: "Scaling mode",
  inputProcessing: "Input processing",
};

/**
 * Turn a failed `TrainerSettingsSchema` parse into a message that names the
 * field, instead of letting the API answer a bare "Invalid trainer
 * settings." with no clue which control is wrong.
 */
export function describeTrainerSettingsError(error: z.ZodError): string {
  const [issue] = error.issues;
  if (!issue) return "One or more settings are invalid.";
  const key = issue.path[0];
  const label =
    (typeof key === "string" && SETTINGS_FIELD_LABELS[key]) ||
    (typeof key === "string" ? key : "A setting");
  return `${label} is invalid: ${issue.message}.`;
}
