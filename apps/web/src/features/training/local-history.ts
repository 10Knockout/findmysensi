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
}

const STORAGE_KEY = "findmysensi:practice_history:v1";

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
    const updated = [record, ...list].slice(0, 100); // Keep latest 100 runs

    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return;
      } catch {
        // Fallback to memory
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
          items = JSON.parse(raw) as PracticeSummaryRecord[];
        }
      } catch {
        items = this.memoryFallback;
      }
    }

    if (modeId) {
      return items.filter((item) => item.modeId === modeId);
    }
    return Object.freeze(items);
  }

  public clear(): void {
    this.memoryFallback = [];
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }
}

export const localPracticeHistory = new LocalPracticeHistory();
