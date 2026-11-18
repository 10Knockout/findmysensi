import {
  TrainerSettingsSchema,
  type TrainerSettings,
} from "@findmysensi/protocol";

const GUEST_SETTINGS_KEY = "findmysensi:guest-settings:v1";
const DEFAULT_SETTINGS = TrainerSettingsSchema.parse({});
let currentSettings = DEFAULT_SETTINGS;

export function loadGuestTrainerSettings(): TrainerSettings {
  try {
    const stored = localStorage.getItem(GUEST_SETTINGS_KEY);
    if (stored !== null) {
      const parsed = TrainerSettingsSchema.safeParse(JSON.parse(stored));
      if (parsed.success) currentSettings = parsed.data;
    }
  } catch {
    // Ignore unavailable storage or an unreadable entry.
  }
  return currentSettings;
}

export function saveGuestTrainerSettings(settings: TrainerSettings): void {
  currentSettings = settings;
  try {
    localStorage.setItem(GUEST_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Settings remain available for this page session.
  }
}
