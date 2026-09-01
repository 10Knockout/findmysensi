export interface PracticeSummaryRecord {
  readonly id: string;
  readonly modeId: string;
  readonly timestamp: number;
  readonly score: number;
  readonly hits: number;
  readonly shots: number;
  readonly misses: number;
  readonly accuracyPercentage: number;
  readonly durationSeconds: number;
  readonly killsPerSecond: number;
  readonly exactReplayPreserved: boolean;
  readonly inputOverflowEvents: number;
  readonly inputHighWaterMark: number;
}

const STORAGE_KEY = "findmysensi:practice_history:v1";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPracticeSummaryRecord(
  value: unknown,
): value is PracticeSummaryRecord {
  if (typeof value !== "object" || value === null) return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.modeId === "string" &&
    record.modeId.length > 0 &&
    isFiniteNumber(record.timestamp) &&
    isFiniteNumber(record.score) &&
    isFiniteNumber(record.hits) &&
    isFiniteNumber(record.shots) &&
    isFiniteNumber(record.misses) &&
    isFiniteNumber(record.accuracyPercentage) &&
    isFiniteNumber(record.durationSeconds) &&
    isFiniteNumber(record.killsPerSecond) &&
    typeof record.exactReplayPreserved === "boolean" &&
    isFiniteNumber(record.inputOverflowEvents) &&
    isFiniteNumber(record.inputHighWaterMark)
  );
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
  private memoryFallback: PracticeSummaryRecord[] = [];

  private isLocalStorageAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined"
    );
  }

  public save(record: PracticeSummaryRecord): void {
    const list = this.getAll();
    const updated = [record, ...list].slice(0, 100);

    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return;
      } catch {
        // Fall back to in-memory summaries when browser storage is unavailable.
      }
    }
    this.memoryFallback = updated;
  }

  public getAll(modeId?: string): readonly PracticeSummaryRecord[] {
    let items = this.memoryFallback;

    if (this.isLocalStorageAvailable()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          items = parseStoredHistory(raw) ?? this.memoryFallback;
        }
      } catch {
        items = this.memoryFallback;
      }
    }

    const selected = modeId
      ? items.filter((item) => item.modeId === modeId)
      : [...items];
    return Object.freeze(selected);
  }

  public clear(): void {
    this.memoryFallback = [];
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage cleanup failures.
      }
    }
  }
}

export const localPracticeHistory = new LocalPracticeHistory();
