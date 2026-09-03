export const PROFILE_AVATARS = [
  { id: "avatar-default", label: "Default" },
] as const;

export const PROFILE_FRAMES = [
  { id: "frame-none", label: "No frame" },
] as const;

export const GRAPHICS_OPTIONS = [
  "automatic",
  "potato",
  "low",
  "balanced",
  "high",
] as const;

export const RESOLUTION_OPTIONS = [
  "native",
  "2560x1440",
  "1920x1080",
  "1600x900",
  "1280x960",
  "1280x720",
  "custom",
] as const;

export const ASPECT_OPTIONS = [
  "16:9",
  "16:10",
  "4:3",
  "5:4",
  "custom",
] as const;
export const SCALING_OPTIONS = [
  "fill",
  "fit",
  "stretch",
  "black-bars",
] as const;
export const INPUT_PROCESSING_OPTIONS = [
  "automatic",
  "1000",
  "2000",
  "4000",
  "8000",
  "maximum",
] as const;
