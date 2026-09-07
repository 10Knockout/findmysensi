import { describe, expect, it } from "vitest";
import type { RunRecord } from "@findmysensi/trainer-runtime";
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
