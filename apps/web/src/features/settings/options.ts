import {
  AVATAR_OPTIONS,
  GAMER_TAG_OPTIONS,
  PROFILE_FRAME_OPTIONS,
} from "@findmysensi/trainer-runtime";

export const PROFILE_AVATARS = AVATAR_OPTIONS;
export const PROFILE_FRAMES = PROFILE_FRAME_OPTIONS;
export const PROFILE_TAGS = GAMER_TAG_OPTIONS;

export const GRAPHICS_OPTIONS = [
  "automatic",
  "potato",
  "low",
  "balanced",
  "high",
] as const;

export const WEAPON_HAND_OPTIONS = ["right", "left"] as const;

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
