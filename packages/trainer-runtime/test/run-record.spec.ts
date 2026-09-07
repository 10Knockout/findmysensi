import { describe, expect, it } from "vitest";
import type { PracticeSummaryRecord } from "../src/results.js";
import {
  ANALYTICS_VERSION,
  DETAILED_RUNS_RETAINED_PER_MODE,
  evaluateRunEligibility,
  findPersonalBest,
  isAnalyticsComparable,
  isLeaderboardComparable,
  selectRunsToRetainInDetail,
  type RunRecord,
  type RunSettingsSnapshot,
} from "../src/run-record.js";

const SETTINGS: RunSettingsSnapshot = {
  fmsSensitivity: "0.245",
  nominalDpi: 2400,
  cmPer360: 43.54,
  fovDegrees: 103,
  resolution: "2560x1440",
  backingWidth: 2560,
  backingHeight: 1440,
  cssWidth: 2560,
  cssHeight: 1440,
  devicePixelRatio: 1,
  scalingMode: "fill",
  fullscreen: true,
  graphicsPreset: "balanced",
  crosshairCode: null,
  rawPointerInputAccepted: true,
  platform: "Windows",
  browser: "Chrome",
  medianRenderFps: 240,
  p95FrameTimeMs: 4.6,
  inputOverflowEvents: 0,
  inputHighWaterMark: 12,
};

function summary(score: number): PracticeSummaryRecord {
  return {
    id: `run-${score}`,
    modeId: "grid",
    timestamp: 1,
    score,
    durationSeconds: 60,
    exactReplayPreserved: true,
    inputOverflowEvents: 0,
    inputHighWaterMark: 12,
    hits: 100,
    shots: 110,
    misses: 10,
    accuracyPercentage: 90.91,
    killsPerSecond: 1.67,
  };
}

function run(overrides: Partial<RunRecord> = {}): RunRecord {
  const score = overrides.finalScore ?? 1_000;
  return {
    runId: overrides.runId ?? `run-${score}`,
    modeId: "grid",
    scenarioVersion: 0,
    scoringVersion: 0,
    analyticsVersion: ANALYTICS_VERSION,
    seed: [1, 2, 3, 4],
    startedAt: 1_000,
    completedAt: 61_000,
    activeDurationMs: 60_000,
    finalScore: score,
    leaderboardEligible: true,
    invalidationReasons: [],
    settings: SETTINGS,
    summary: summary(score),
    ...overrides,
  };
}

const CLEAN_ELIGIBILITY = {
  wasPaused: false,
  settingsChangedMidRun: false,
  sensitivityChangedMidRun: false,
  pointerLockLost: false,
  rawPointerInputAccepted: true,
  exactReplayPreserved: true,
  debugOverrideActive: false,
  completed: true,
};

describe("evaluateRunEligibility", () => {
  it("accepts a clean, completed run", () => {
    const result = evaluateRunEligibility(CLEAN_ELIGIBILITY);
    expect(result.leaderboardEligible).toBe(true);
    expect(result.invalidationReasons).toEqual([]);
  });

  it("rejects a paused run and says why", () => {
    const result = evaluateRunEligibility({
      ...CLEAN_ELIGIBILITY,
      wasPaused: true,
    });
    expect(result.leaderboardEligible).toBe(false);
    expect(result.invalidationReasons).toContain("paused-mid-run");
  });

  it("reports every applicable reason, not just the first", () => {
    const result = evaluateRunEligibility({
      ...CLEAN_ELIGIBILITY,
      wasPaused: true,
      pointerLockLost: true,
      rawPointerInputAccepted: false,
    });
    expect(result.invalidationReasons).toEqual(
      expect.arrayContaining([
        "paused-mid-run",
        "pointer-lock-lost",
        "raw-input-unavailable",
      ]),
    );
  });

  it("rejects an unfinished run", () => {
    const result = evaluateRunEligibility({
      ...CLEAN_ELIGIBILITY,
      completed: false,
    });
    expect(result.invalidationReasons).toContain("run-incomplete");
  });

  it("rejects a run whose simulation could not be verified", () => {
    const result = evaluateRunEligibility({
      ...CLEAN_ELIGIBILITY,
      exactReplayPreserved: false,
    });
    expect(result.invalidationReasons).toContain("simulation-desync");
  });
});

describe("comparability", () => {
  it("refuses to compare across scenario versions", () => {
    expect(isLeaderboardComparable(run(), run({ scenarioVersion: 1 }))).toBe(
      false,
    );
  });

  it("refuses to compare across scoring versions", () => {
    expect(isLeaderboardComparable(run(), run({ scoringVersion: 1 }))).toBe(
      false,
    );
  });

  it("refuses to compare across modes", () => {
    expect(isLeaderboardComparable(run(), run({ modeId: "pinpoint" }))).toBe(
      false,
    );
  });

  it("allows a differing analytics version on a leaderboard but not in analytics", () => {
    const other = run({ analyticsVersion: ANALYTICS_VERSION + 1 });
    expect(isLeaderboardComparable(run(), other)).toBe(true);
    expect(isAnalyticsComparable(run(), other)).toBe(false);
  });
});

describe("findPersonalBest", () => {
  it("returns null when there is no history", () => {
    expect(findPersonalBest([], "grid")).toBeNull();
  });

  it("picks the highest eligible score", () => {
    const runs = [
      run({ runId: "a", finalScore: 900 }),
      run({ runId: "b", finalScore: 1_500 }),
      run({ runId: "c", finalScore: 1_200 }),
    ];
    expect(findPersonalBest(runs, "grid")?.runId).toBe("b");
  });

  it("never treats an ineligible run as a personal best", () => {
    const runs = [
      run({ runId: "clean", finalScore: 900 }),
      run({
        runId: "paused",
        finalScore: 9_999,
        leaderboardEligible: false,
        invalidationReasons: ["paused-mid-run"],
      }),
    ];
    expect(findPersonalBest(runs, "grid")?.runId).toBe("clean");
  });

  it("breaks a tie deterministically in favour of the earlier run", () => {
    const runs = [
      run({ runId: "later", finalScore: 1_000, completedAt: 90_000 }),
      run({ runId: "earlier", finalScore: 1_000, completedAt: 61_000 }),
    ];
    expect(findPersonalBest(runs, "grid")?.runId).toBe("earlier");
    // Input order must not change the answer.
    expect(findPersonalBest([...runs].reverse(), "grid")?.runId).toBe(
      "earlier",
    );
  });

  it("ignores other modes", () => {
    const runs = [
      run({ runId: "grid", finalScore: 500 }),
      run({ runId: "pin", finalScore: 5_000, modeId: "pinpoint" }),
    ];
    expect(findPersonalBest(runs, "grid")?.runId).toBe("grid");
  });
});

describe("selectRunsToRetainInDetail", () => {
  it("keeps the personal best plus the most recent runs", () => {
    const runs = [
      run({ runId: "pb", finalScore: 9_000, completedAt: 1_000 }),
      run({ runId: "r1", finalScore: 100, completedAt: 8_000 }),
      run({ runId: "r2", finalScore: 100, completedAt: 7_000 }),
      run({ runId: "r3", finalScore: 100, completedAt: 6_000 }),
      run({ runId: "r4", finalScore: 100, completedAt: 5_000 }),
      run({ runId: "r5", finalScore: 100, completedAt: 4_000 }),
      run({ runId: "old", finalScore: 100, completedAt: 2_000 }),
    ];

    const kept = selectRunsToRetainInDetail(runs, "grid");
    // The old low-scoring run is the one that sheds detail.
    expect(kept).not.toContain("old");
    expect(kept).toContain("pb");
    expect(kept).toEqual(
      expect.arrayContaining(["r1", "r2", "r3", "r4", "r5"]),
    );
    expect(kept.length).toBe(DETAILED_RUNS_RETAINED_PER_MODE + 1);
  });

  it("does not duplicate a personal best that is also recent", () => {
    const runs = [
      run({ runId: "a", finalScore: 9_000, completedAt: 9_000 }),
      run({ runId: "b", finalScore: 100, completedAt: 8_000 }),
    ];
    const kept = selectRunsToRetainInDetail(runs, "grid");
    expect(new Set(kept).size).toBe(kept.length);
    expect(kept.length).toBe(2);
  });

  it("returns nothing for a mode with no runs", () => {
    expect(selectRunsToRetainInDetail([run()], "turn180")).toEqual([]);
  });
});
