import type {
  LifetimeStats,
  PracticeSummaryRecord,
} from "@findmysensi/trainer-runtime";

export type { PracticeSummaryRecord, LifetimeStats };

export function getPracticeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : (window.localStorage ?? null);
  } catch {
    return null;
  }
}

const STORAGE_KEY = "findmysensi:practice_history:v1";
const STATS_KEY = "findmysensi:practice_stats:v1";
const CLICK_MODE_IDS = new Set<PracticeSummaryRecord["modeId"]>([
  "grid",
  "pathline",
  "pinpoint",
  "multi",
  "headline",
  "microshot",
  "reaction",
  "anchor-flick",
  "motion-flick",
  "turn180",
]);

/** No-click modes scored on time-on-target rather than hits and shots. */
const TRACKING_MODE_IDS = new Set<PracticeSummaryRecord["modeId"]>([
  "smooth-track",
  "strafe",
]);

const ZERO_LIFETIME_STATS: LifetimeStats = {
  totalSessions: 0,
  totalShots: 0,
  totalPracticeSeconds: 0,
};

function isLifetimeStats(value: unknown): value is LifetimeStats {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    isFiniteNumber(s.totalSessions) &&
    isFiniteNumber(s.totalShots) &&
    isFiniteNumber(s.totalPracticeSeconds)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isPracticeSummaryRecord(
  value: unknown,
): value is PracticeSummaryRecord {
  if (typeof value !== "object" || value === null) return false;

  const record = value as Record<string, unknown>;
  const hasBase =
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.modeId === "string" &&
    isFiniteNumber(record.timestamp) &&
    isFiniteNumber(record.score) &&
    isFiniteNumber(record.durationSeconds) &&
    typeof record.exactReplayPreserved === "boolean" &&
    isFiniteNumber(record.inputOverflowEvents) &&
    isFiniteNumber(record.inputHighWaterMark);
  if (!hasBase) return false;

  if (CLICK_MODE_IDS.has(record.modeId as PracticeSummaryRecord["modeId"])) {
    return (
      isFiniteNumber(record.hits) &&
      isFiniteNumber(record.shots) &&
      isFiniteNumber(record.misses) &&
      isFiniteNumber(record.accuracyPercentage) &&
      isFiniteNumber(record.killsPerSecond) &&
      (record.modeId !== "pathline" ||
        (isFiniteNumber(record.segmentsCompleted) &&
          isFiniteNumber(record.cleanSegments) &&
          isFiniteNumber(record.corridorTicks) &&
          isFiniteNumber(record.pathTicks))) &&
      (record.averageAcquisitionTicks === undefined ||
        isFiniteNumber(record.averageAcquisitionTicks))
    );
  }
  if (TRACKING_MODE_IDS.has(record.modeId as PracticeSummaryRecord["modeId"])) {
    return (
      isFiniteNumber(record.onTargetTicks) &&
      isFiniteNumber(record.totalTicks) &&
      isFiniteNumber(record.onTargetPercentage) &&
      isFiniteNumber(record.averageErrorUnits) &&
      isFiniteNumber(record.maxErrorUnits)
    );
  }
  if (record.modeId === "switch-track") {
    return (
      isFiniteNumber(record.switchesCompleted) &&
      isFiniteNumber(record.onTargetTicks) &&
      isFiniteNumber(record.totalTicks) &&
      isFiniteNumber(record.onTargetPercentage) &&
      isFiniteNumber(record.averageErrorUnits) &&
      isFiniteNumber(record.maxErrorUnits) &&
      isFiniteNumber(record.averageAcquisitionTicks)
    );
  }
  return false;
}

function parseStoredHistory(raw: string): PracticeSummaryRecord[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isPracticeSummaryRecord);
  } catch {
    return null;
  }
}

export class LocalPracticeHistory {
  private memoryFallback: PracticeSummaryRecord[] | null = null;
  private memoryStatsFallback: LifetimeStats | null = null;

  public save(record: PracticeSummaryRecord): void {
    const list = this.getAll();
    const updated = [record, ...list].slice(0, 100);

    const storage = getPracticeStorage();
    if (storage) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(updated));
        this.memoryFallback = null;
      } catch {
        this.memoryFallback = updated;
      }
    } else {
      this.memoryFallback = updated;
    }

    const shots =
      "shots" in record && isFiniteNumber(record.shots) ? record.shots : 0;
    const prevStats = this.getLifetimeStats();
    const nextStats: LifetimeStats = {
      totalSessions: prevStats.totalSessions + 1,
      totalShots: prevStats.totalShots + shots,
      totalPracticeSeconds:
        prevStats.totalPracticeSeconds + record.durationSeconds,
    };
    if (storage) {
      try {
        storage.setItem(STATS_KEY, JSON.stringify(nextStats));
        this.memoryStatsFallback = null;
        return;
      } catch {
        // Fall back to in-memory stats when browser storage is unavailable.
      }
    }
    this.memoryStatsFallback = nextStats;
  }

  /**
   * Uncapped lifetime totals -- unlike getAll(), never pruned to the most
   * recent 100 records. Volume-based achievements read this, not
   * history.length, since a real player can (and should be able to) exceed
   * 100 sessions.
   */
  public getLifetimeStats(): LifetimeStats {
    if (this.memoryStatsFallback) return this.memoryStatsFallback;
    try {
      const raw = getPracticeStorage()?.getItem(STATS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isLifetimeStats(parsed)) return parsed;
      }
    } catch {
      // Missing or invalid storage has no lifetime totals.
    }
    return { ...ZERO_LIFETIME_STATS };
  }

  public getAll(modeId?: string): readonly PracticeSummaryRecord[] {
    let items = this.memoryFallback ?? [];

    if (this.memoryFallback === null) {
      try {
        const raw = getPracticeStorage()?.getItem(STORAGE_KEY);
        if (raw) {
          items = parseStoredHistory(raw) ?? [];
        }
      } catch {
        // Unreadable storage has no local history.
      }
    }

    const selected = modeId
      ? items.filter((item) => item.modeId === modeId)
      : [...items];
    return Object.freeze(selected);
  }

  public clear(): void {
    this.memoryFallback = [];
    this.memoryStatsFallback = { ...ZERO_LIFETIME_STATS };
    const storage = getPracticeStorage();
    if (storage) {
      try {
        storage.removeItem(STORAGE_KEY);
        this.memoryFallback = null;
        storage.removeItem(STATS_KEY);
        this.memoryStatsFallback = null;
      } catch {
        // Ignore storage cleanup failures.
      }
    }
  }
}

export const localPracticeHistory = new LocalPracticeHistory();
