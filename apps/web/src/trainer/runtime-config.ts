import {
  createDefaultProcessingPolicy,
  InputProcessingPreset,
} from "@findmysensi/input-browser";
import { TrainerSettings } from "@findmysensi/protocol";
import { resolveBrowserGainAngleUnits } from "@findmysensi/sensitivity";

export interface GridshotRuntimeConfig {
  readonly fovDegrees: number;
  readonly inputGainAngleUnitsPerUnit: number;
  readonly inputBufferCapacity: number;
  readonly scalingMode: "fit" | "stretch" | "black-bars";
  readonly targetColor: string;
  readonly targetOpacity: number;
  readonly targetOutline: boolean;
  readonly crosshairCode: string | null;
  readonly graphicsPreset: TrainerSettings["graphicsPreset"];
  readonly resolution: TrainerSettings["resolution"];
  readonly customResolutionWidth: number | null;
  readonly customResolutionHeight: number | null;
}

export function toProcessingPreset(
  value: TrainerSettings["inputProcessing"],
): InputProcessingPreset {
  if (value === "automatic") return "auto";
  if (value === "maximum") return "maximum";
  return Number(value) as 1000 | 2000 | 4000 | 8000;
}

export function resolveGridshotRuntimeConfig(
  settings: TrainerSettings,
  observedInputRateHz: number = 1000,
): GridshotRuntimeConfig {
  const preset = toProcessingPreset(settings.inputProcessing);
  const processingPolicy = createDefaultProcessingPolicy();

  return Object.freeze({
    fovDegrees: settings.fovDegrees,
    inputGainAngleUnitsPerUnit: resolveBrowserGainAngleUnits(
      settings.fmsSensitivity,
    ),
    inputBufferCapacity: processingPolicy.getEffectiveCapacity(
      preset,
      observedInputRateHz,
    ),
    scalingMode: settings.scalingMode,
    targetColor: settings.targetColor,
    targetOpacity: settings.targetOpacity,
    targetOutline: settings.targetOutline,
    crosshairCode: settings.crosshairCode,
    graphicsPreset: settings.graphicsPreset,
    resolution: settings.resolution,
    customResolutionWidth: settings.customResolutionWidth,
    customResolutionHeight: settings.customResolutionHeight,
  });
}
