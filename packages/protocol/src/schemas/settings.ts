import { z } from "zod";

export const DEFAULT_TRAINING_FOV_DEGREES = 103;

export const TrainerSettingsSchema = z
  .object({
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
    targetColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .default("#7CFF6B"),
    targetOpacity: z.number().min(0.2).max(1).default(1),
    targetOutline: z.boolean().default(false),
    crosshairCode: z.string().max(512).nullable().default(null),
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
