import { createDefaultProcessingPolicy } from "@findmysensi/input-browser";
import { TrainerSettings } from "@findmysensi/protocol";
import {
  BrowserInputGain,
  resolveBrowserInputGain,
} from "@findmysensi/sensitivity";

export interface TrainerRuntimeConfig {
  readonly fovDegrees: number;
  readonly inputGain: BrowserInputGain;
  readonly inputBufferCapacity: number;
  readonly scalingMode: "fit" | "fill" | "stretch" | "black-bars";
  readonly targetColor: string;
  readonly targetOpacity: number;
  readonly targetOutline: boolean;
  readonly crosshairCode: string | null;
  readonly graphicsPreset: TrainerSettings["graphicsPreset"];
  readonly resolution: TrainerSettings["resolution"];
  readonly customResolutionWidth: number | null;
  readonly customResolutionHeight: number | null;
}

export function resolveTrainerRuntimeConfig(
  settings: TrainerSettings,
): TrainerRuntimeConfig {
  if (
    settings.resolution === "custom" &&
    (settings.customResolutionWidth === null ||
      settings.customResolutionHeight === null)
  ) {
    throw new RangeError(
      "Custom resolution requires both a width and a height.",
    );
  }

  const processingPolicy = createDefaultProcessingPolicy();

  return Object.freeze({
    fovDegrees: settings.fovDegrees,
    inputGain: resolveBrowserInputGain(settings.fmsSensitivity),
    inputBufferCapacity: processingPolicy.getEffectiveCapacity(),
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
