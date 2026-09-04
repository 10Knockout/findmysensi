import {
  evaluateAchievements,
  type LifetimeStats,
  type PracticeSummaryRecord,
} from "@findmysensi/trainer-runtime";

const STORAGE_KEY = "findmysensi:achievements_unlocked:v1";

function parseStoredIds(raw: string): readonly string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

/**
 * Persisted, sticky wrapper around evaluateAchievements(). Once an
 * achievement id is unlocked it stays unlocked forever, even after the
 * capped practice-history window or a lifetime-stats snapshot no longer
 * shows the qualifying evidence directly -- matching ordinary game
 * achievement semantics (earned once, kept always), not a live recomputed
 * badge that could flicker off.
 */
export class LocalAchievements {
  private memoryFallback: Set<string> = new Set();

  private isLocalStorageAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined"
    );
  }

  public getUnlocked(): ReadonlySet<string> {
    if (this.isLocalStorageAvailable()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) return new Set(parseStoredIds(raw));
        return this.memoryFallback;
      } catch {
        return this.memoryFallback;
      }
    }
    return this.memoryFallback;
  }

  /**
   * Evaluates the current achievement definitions against real history and
   * lifetime stats, unions any newly-qualifying ids into the persisted
   * unlocked set, and returns just the ids newly unlocked by this call
   * (empty set if nothing new).
   */
  public sync(
    history: readonly PracticeSummaryRecord[],
    lifetime: LifetimeStats,
  ): ReadonlySet<string> {
    const already = this.getUnlocked();
    const evaluated = evaluateAchievements(history, lifetime);

    const newlyUnlocked = new Set<string>();
    for (const id of evaluated) {
      if (!already.has(id)) newlyUnlocked.add(id);
    }
    if (newlyUnlocked.size === 0) return newlyUnlocked;

    const merged = new Set([...already, ...newlyUnlocked]);
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...merged]));
        return newlyUnlocked;
      } catch {
        // Fall back to in-memory persistence when browser storage fails.
      }
    }
    this.memoryFallback = merged;
    return newlyUnlocked;
  }

  public clear(): void {
    this.memoryFallback = new Set();
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage cleanup failures.
      }
    }
  }
}

export const localAchievements = new LocalAchievements();
