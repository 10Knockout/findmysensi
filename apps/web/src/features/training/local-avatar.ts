import { AVATAR_OPTIONS } from "@findmysensi/trainer-runtime";

const STORAGE_KEY = "findmysensi:selected_avatar:v1";
const DEFAULT_AVATAR_ID = AVATAR_OPTIONS[0]!.id;

function isLocalStorageAvailable(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

/** The player's selected avatar id, defaulting to the first preset. */
export function getSelectedAvatarId(): string {
  if (isLocalStorageAvailable()) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && AVATAR_OPTIONS.some((a) => a.id === stored)) {
        return stored;
      }
    } catch {
      // Fall through to default.
    }
  }
  return DEFAULT_AVATAR_ID;
}

/** Persists an avatar selection. Silently ignores an unknown/invalid id. */
export function setSelectedAvatarId(id: string): void {
  if (!AVATAR_OPTIONS.some((a) => a.id === id)) return;
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Ignore storage failures -- selection just won't persist this session.
  }
}
