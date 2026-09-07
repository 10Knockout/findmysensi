import {
  findPersonalBest,
  RUN_INVALIDATION_MESSAGES,
  selectRunsToRetainInDetail,
  type PracticeSummaryRecord,
  type RunInvalidationReason,
  type RunRecord,
} from "@findmysensi/trainer-runtime";
import { isPracticeSummaryRecord } from "./local-history.js";

const STORAGE_KEY = "fms_run_records_v1";

/**
 * How many runs are kept at all, across every mode. The per-mode detail rule
 * (personal best plus the most recent few) decides which of those keep their
 * heavy payload; this is just a hard ceiling so a very active player cannot
 * grow local storage without bound.
 */
const MAX_RUNS_STORED = 200;

/**
 * Local store for full run records.
 *
 * Deliberately separate from `localPracticeHistory`: that store holds the
 * lightweight summaries every screen reads, and is capped and shaped for
 * cheap frequent access. Run records are heavier and are pruned on a
 * different rule, so mixing them would make both harder to reason about.
 *
 * A run pruned to summary-only keeps its identity, score, settings and result
 * forever -- it only sheds the detail that movement analysis would need. That
 * is what keeps trends and personal bests complete while bounding storage.
 */
export class LocalRunHistory {
  private memoryFallback: RunRecord[] = [];

  private isLocalStorageAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined"
    );
  }

  public getAll(modeId?: PracticeSummaryRecord["modeId"]): RunRecord[] {
    const all = this.read();
    return modeId ? all.filter((run) => run.modeId === modeId) : all;
  }

  public getById(runId: string): RunRecord | null {
    return this.read().find((run) => run.runId === runId) ?? null;
  }

  public getPersonalBest(
    modeId: PracticeSummaryRecord["modeId"],
  ): RunRecord | null {
    return findPersonalBest(this.read(), modeId);
  }

  public save(record: RunRecord): void {
    this.write(this.prune([record, ...this.read()]));
  }

  public clear(): void {
    this.memoryFallback = [];
    if (!this.isLocalStorageAvailable()) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing more to do; the in-memory copy is already cleared.
    }
  }

  /**
   * Applies the retention rule: within each mode, the personal best and the
   * most recent runs keep everything; the rest survive as records but no
   * longer carry detail.
   */
  private prune(runs: readonly RunRecord[]): RunRecord[] {
    const modeIds = new Set(runs.map((run) => run.modeId));
    const detailed = new Set<string>();
    for (const modeId of modeIds) {
      for (const runId of selectRunsToRetainInDetail(runs, modeId)) {
        detailed.add(runId);
      }
    }

    return [...runs]
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, MAX_RUNS_STORED)
      .map((run) => (detailed.has(run.runId) ? run : stripDetail(run)));
  }

  private read(): RunRecord[] {
    if (!this.isLocalStorageAvailable()) return [...this.memoryFallback];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isRunRecord);
    } catch {
      // Corrupt or unreadable storage is treated as empty rather than
      // crashing the results screen.
      return [...this.memoryFallback];
    }
  }

  private write(runs: RunRecord[]): void {
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
        return;
      } catch {
        // Quota or private-mode failure: fall through to memory.
      }
    }
    this.memoryFallback = runs;
  }
}

/**
 * Drops the parts of a record that only deep analysis needs, keeping the
 * identity, versions, settings and result. Today a record carries no bulk
 * telemetry, so this is a passthrough -- but it is the single seam where shot
 * arrays and per-tick series will be removed once they exist, and having it
 * in place means the retention rule is already enforced rather than being
 * something to remember later.
 */
function stripDetail(run: RunRecord): RunRecord {
  return run;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRunRecord(value: unknown): value is RunRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const summary = record.summary;
  return (
    typeof record.runId === "string" &&
    record.runId.length > 0 &&
    typeof record.modeId === "string" &&
    isFiniteNumber(record.scenarioVersion) &&
    isFiniteNumber(record.scoringVersion) &&
    isFiniteNumber(record.analyticsVersion) &&
    isFiniteNumber(record.startedAt) &&
    isFiniteNumber(record.completedAt) &&
    isFiniteNumber(record.activeDurationMs) &&
    isFiniteNumber(record.finalScore) &&
    typeof record.leaderboardEligible === "boolean" &&
    Array.isArray(record.invalidationReasons) &&
    record.invalidationReasons.every(isRunInvalidationReason) &&
    Array.isArray(record.seed) &&
    record.seed.length === 4 &&
    record.seed.every(isFiniteNumber) &&
    typeof record.settings === "object" &&
    record.settings !== null &&
    isPracticeSummaryRecord(summary) &&
    summary.modeId === record.modeId
  );
}

function isRunInvalidationReason(
  value: unknown,
): value is RunInvalidationReason {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(RUN_INVALIDATION_MESSAGES, value)
  );
}

export const localRunHistory = new LocalRunHistory();
