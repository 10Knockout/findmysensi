import { describe, expect, it } from "vitest";
import {
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
} from "@findmysensi/aim-core";
import {
  createTick,
  PracticeRunSubmissionV2Schema,
} from "@findmysensi/protocol";
import { PINPOINT_TARGET_LIFETIME_TICKS } from "@findmysensi/scenarios";
import {
  createPinpointModeAdapter,
  type RunRecord,
} from "@findmysensi/trainer-runtime";
import { toPracticeRunSubmissionV2 } from "./run-sync.js";

function run(): RunRecord {
  return {
    runId: "practice-sync-test",
    modeId: "grid",
    scenarioVersion: 0,
    scoringVersion: 0,
    analyticsVersion: 1,
    seed: [1, 2, 3, 4],
    startedAt: 1_000,
    completedAt: 61_000,
    activeDurationMs: 60_000,
    finalScore: 9_000,
    leaderboardEligible: false,
    invalidationReasons: ["pointer-lock-lost"],
    settings: {
      fmsSensitivity: "0.175",
      nominalDpi: 800,
      cmPer360: 54.43,
      fovDegrees: 103,
      resolution: "1920x1080",
      backingWidth: 1920,
      backingHeight: 1080,
      cssWidth: 1920,
      cssHeight: 1080,
      devicePixelRatio: 1,
      scalingMode: "fill",
      fullscreen: true,
      graphicsPreset: "automatic",
      crosshairCode: null,
      rawPointerInputAccepted: false,
      platform: "Windows",
      browser: "Chrome",
      medianRenderFps: null,
      p95FrameTimeMs: null,
      inputOverflowEvents: 0,
      inputHighWaterMark: 0,
    },
    summary: {
      id: "practice-sync-test",
      modeId: "grid",
      timestamp: 61_000,
      score: 9_000,
      durationSeconds: 60,
      exactReplayPreserved: true,
      inputOverflowEvents: 0,
      inputHighWaterMark: 0,
      hits: 90,
      shots: 100,
      misses: 10,
      accuracyPercentage: 90,
      killsPerSecond: 1.5,
    },
  };
}

describe("toPracticeRunSubmissionV2", () => {
  it("submits Precision Six scores after target expiration", () => {
    const adapter = createPinpointModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);
    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(5),
      createAngleUnits(target.xAngleUnits),
      createPitchUnits(target.yAngleUnits),
      prng,
    );
    adapter.onSimulationTick(
      createTick(PINPOINT_TARGET_LIFETIME_TICKS + 1),
      createAngleUnits(0),
      createPitchUnits(0),
    );
    const metrics = adapter.computeMetrics(adapter.definition.durationTicks);
    const finalScore = adapter.computeScore(metrics).score;
    const baseline = run();
    const { summary } = baseline;
    if (!("shots" in summary)) throw new Error("Expected a click summary");
    const localRun: RunRecord = {
      ...baseline,
      modeId: "pinpoint",
      finalScore,
      summary: {
        ...summary,
        modeId: "pinpoint",
        score: finalScore,
        hits: metrics.hits,
        shots: metrics.shots,
        misses: metrics.misses,
        accuracyPercentage: metrics.accuracyPercentage,
        killsPerSecond: metrics.killsPerSecond,
      },
    };

    expect(metrics.shots).toBe(1);
    expect(metrics.misses).toBeGreaterThan(0);
    const submission = PracticeRunSubmissionV2Schema.parse(
      toPracticeRunSubmissionV2(localRun),
    );
    expect(submission.finalScore).toBe(finalScore);
    expect(submission.summary).toMatchObject({ hits: 1, shots: 1, misses: 0 });
    expect(localRun.summary).toMatchObject({ misses: metrics.misses });
  });

  it("keeps local eligibility explicitly client-scoped", () => {
    const submission = toPracticeRunSubmissionV2(run());
    expect(submission).toMatchObject({
      protocolVersion: 2,
      runClass: "practice",
      clientEligibility: {
        leaderboardEligible: false,
        invalidationReasons: ["pointer-lock-lost"],
      },
    });
    expect(submission).not.toHaveProperty("competitiveEligibility");
  });

  it("rejects settings values outside the V2 vocabulary", () => {
    const invalid = run();
    const modified: RunRecord = {
      ...invalid,
      settings: { ...invalid.settings, scalingMode: "future-mode" },
    };
    expect(() => toPracticeRunSubmissionV2(modified)).toThrow(
      "Unsupported run scaling mode",
    );
  });
});
