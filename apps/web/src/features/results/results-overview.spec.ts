import { describe, expect, it } from "vitest";
import type {
  PracticeSummaryRecord,
  RunRecord,
  RunSettingsSnapshot,
} from "@findmysensi/trainer-runtime";
import {
  buildResultsOverview,
  type OverviewMetric,
} from "./results-overview.js";

const SETTINGS: RunSettingsSnapshot = {
  fmsSensitivity: "0.175",
  nominalDpi: 800,
  cmPer360: 46.68,
  fovDegrees: 103,
  resolution: "native",
  backingWidth: 1920,
  backingHeight: 1080,
  cssWidth: 1920,
  cssHeight: 1080,
  devicePixelRatio: 1,
  scalingMode: "fill",
  fullscreen: true,
  graphicsPreset: "performance",
  crosshairCode: null,
  rawPointerInputAccepted: true,
  platform: "Windows",
  browser: "Chrome",
  medianRenderFps: null,
  p95FrameTimeMs: null,
  inputOverflowEvents: 0,
  inputHighWaterMark: 0,
};

type ClickModeId = Extract<
  PracticeSummaryRecord["modeId"],
  | "grid"
  | "pinpoint"
  | "multi"
  | "headline"
  | "microshot"
  | "reaction"
  | "anchor-flick"
  | "motion-flick"
  | "turn180"
>;

const CLICK_MODE_IDS: readonly ClickModeId[] = [
  "grid",
  "pinpoint",
  "multi",
  "headline",
  "microshot",
  "reaction",
  "anchor-flick",
  "motion-flick",
  "turn180",
];

function clickSummary(modeId: ClickModeId = "grid"): PracticeSummaryRecord {
  return {
    id: "current",
    modeId,
    timestamp: 61_000,
    score: 900,
    durationSeconds: 60,
    exactReplayPreserved: true,
    inputOverflowEvents: 0,
    inputHighWaterMark: 0,
    hits: 90,
    shots: 100,
    misses: 10,
    accuracyPercentage: 90,
    killsPerSecond: 1.5,
    averageAcquisitionTicks: 32,
  } as PracticeSummaryRecord;
}

function run(overrides: Partial<RunRecord> = {}): RunRecord {
  const summary = overrides.summary ?? clickSummary();
  return {
    runId: overrides.runId ?? summary.id,
    modeId: overrides.modeId ?? summary.modeId,
    scenarioVersion: 0,
    scoringVersion: 0,
    analyticsVersion: 1,
    seed: [1, 2, 3, 4],
    startedAt: 1_000,
    completedAt: 61_000,
    activeDurationMs: 60_000,
    finalScore: summary.score,
    leaderboardEligible: true,
    invalidationReasons: [],
    settings: SETTINGS,
    ...overrides,
    summary,
  };
}

function metric(
  metrics: readonly OverviewMetric[],
  label: string,
): OverviewMetric {
  const found = metrics.find((entry) => entry.label === label);
  if (!found) throw new Error(`Missing metric: ${label}`);
  return found;
}

describe("buildResultsOverview", () => {
  it.each(CLICK_MODE_IDS)(
    "builds a bounded Overview for the %s click mode",
    (modeId) => {
      const current = run({ modeId, summary: clickSummary(modeId) });
      const overview = buildResultsOverview(current, [current]);

      expect(overview.summaryMetrics).toHaveLength(7);
      expect(overview.detailMetrics.length).toBeGreaterThanOrEqual(4);
      expect(overview.detailMetrics.length).toBeLessThanOrEqual(8);
      expect(metric(overview.summaryMetrics, "Accuracy").value).toBe("90%");
    },
  );

  it("uses only eligible runs from matching scenario and scoring versions for PB", () => {
    const current = run({ runId: "current", finalScore: 900 });
    const eligiblePb = run({ runId: "pb", finalScore: 1_000 });
    const incompatible = run({
      runId: "other-version",
      finalScore: 9_000,
      scenarioVersion: 1,
    });
    const ineligible = run({
      runId: "paused",
      finalScore: 8_000,
      leaderboardEligible: false,
      invalidationReasons: ["paused-mid-run"],
    });

    const overview = buildResultsOverview(current, [
      current,
      eligiblePb,
      incompatible,
      ineligible,
    ]);

    expect(overview.personalBest?.runId).toBe("pb");
    expect(metric(overview.summaryMetrics, "Personal Best").value).toBe(
      "1,000",
    );
    expect(metric(overview.summaryMetrics, "Vs Personal Best").value).toBe(
      "−100",
    );
  });

  it("reports improvement against the previous PB when the current run sets a new one", () => {
    const current = run({ runId: "current", finalScore: 1_200 });
    const previous = run({ runId: "previous", finalScore: 1_000 });

    const overview = buildResultsOverview(current, [current, previous]);

    expect(overview.personalBest?.runId).toBe("current");
    expect(metric(overview.summaryMetrics, "Personal Best").value).toBe(
      "1,200",
    );
    expect(metric(overview.summaryMetrics, "Vs Personal Best")).toMatchObject({
      value: "+200",
      note: "New personal best",
      tone: "positive",
    });
  });

  it("shows real acquisition timing as the primary metric for Reflex Rush", () => {
    const current = run({
      modeId: "reaction",
      summary: clickSummary("reaction"),
    });
    const overview = buildResultsOverview(current, [current]);

    expect(metric(overview.summaryMetrics, "Accuracy").value).toBe("90%");
    expect(metric(overview.summaryMetrics, "Average Acquisition").value).toBe(
      "250 ms",
    );
    expect(metric(overview.detailMetrics, "Targets Hit").value).toBe("90");
  });

  it.each(["strafe", "smooth-track"] as const)(
    "uses tracking accuracy and angular error for %s",
    (modeId) => {
      const summary: PracticeSummaryRecord = {
        id: "tracking",
        modeId,
        timestamp: 61_000,
        score: 5_000,
        durationSeconds: 60,
        exactReplayPreserved: true,
        inputOverflowEvents: 0,
        inputHighWaterMark: 0,
        onTargetTicks: 6_400,
        totalTicks: 7_680,
        onTargetPercentage: 83.33,
        averageErrorUnits: 46_603,
        maxErrorUnits: 93_207,
      };
      const current = run({
        runId: "tracking",
        modeId,
        finalScore: 5_000,
        summary,
      });
      const overview = buildResultsOverview(current, [current]);

      expect(metric(overview.summaryMetrics, "Tracking Accuracy").value).toBe(
        "83.33%",
      );
      expect(metric(overview.summaryMetrics, "Score / Min").value).toBe(
        "5,000",
      );
      expect(metric(overview.detailMetrics, "Time On Target").value).toBe(
        "50 s",
      );
      expect(metric(overview.detailMetrics, "Average Aim Error").value).toBe(
        "1°",
      );
    },
  );

  it("surfaces switching rate and acquisition without inventing TTK", () => {
    const summary: PracticeSummaryRecord = {
      id: "switch",
      modeId: "switch-track",
      timestamp: 61_000,
      score: 4_000,
      durationSeconds: 60,
      exactReplayPreserved: true,
      inputOverflowEvents: 0,
      inputHighWaterMark: 0,
      switchesCompleted: 20,
      onTargetTicks: 5_000,
      totalTicks: 7_680,
      onTargetPercentage: 65.1,
      averageErrorUnits: 46_603,
      maxErrorUnits: 93_207,
      averageAcquisitionTicks: 64,
    };
    const current = run({
      runId: "switch",
      modeId: "switch-track",
      finalScore: 4_000,
      summary,
    });
    const overview = buildResultsOverview(current, [current]);

    expect(metric(overview.summaryMetrics, "Average Acquisition").value).toBe(
      "500 ms",
    );
    expect(metric(overview.detailMetrics, "Switches / Min").value).toBe("20");
    expect(overview.detailMetrics.some((entry) => entry.label === "TTK")).toBe(
      false,
    );
  });

  it("shows only a verified server standing as global rank and percentile", () => {
    const current = run();
    const overview = buildResultsOverview(current, [current], {
      board: {
        boardId: "grid:scenario-0:scoring-0",
        modeId: "grid",
        scenarioVersion: 0,
        scoringVersion: 0,
      },
      totalPlayers: 25,
      percentileMinimumPlayers: 10,
      standing: {
        rank: 3,
        score: 1_000,
        percentile: 91.6666666667,
        totalPlayers: 25,
        achievedAt: "2026-09-07T12:00:00.000Z",
      },
    });

    expect(metric(overview.summaryMetrics, "Leaderboard Rank")).toMatchObject({
      value: "#3",
      note: "Verified PB among 25 players",
    });
    expect(metric(overview.summaryMetrics, "Percentile")).toMatchObject({
      value: "91.7%",
      note: "Verified-player population",
    });
  });
});
