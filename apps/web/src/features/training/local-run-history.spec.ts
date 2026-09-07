import { afterEach, describe, expect, it, vi } from "vitest";
import type { RunRecord } from "@findmysensi/trainer-runtime";
import { LocalRunHistory } from "./local-run-history.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function run(): RunRecord {
  return {
    runId: "run-1",
    modeId: "grid",
    scenarioVersion: 0,
    scoringVersion: 0,
    analyticsVersion: 1,
    seed: [1, 2, 3, 4],
    startedAt: 1_000,
    completedAt: 61_000,
    activeDurationMs: 60_000,
    finalScore: 1_000,
    leaderboardEligible: false,
    invalidationReasons: ["raw-input-unavailable"],
    settings: {
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
      rawPointerInputAccepted: false,
      platform: "Windows",
      browser: "Chrome",
      medianRenderFps: null,
      p95FrameTimeMs: null,
      inputOverflowEvents: 0,
      inputHighWaterMark: 0,
    },
    summary: {
      id: "run-1",
      modeId: "grid",
      timestamp: 61_000,
      score: 1_000,
      durationSeconds: 60,
      exactReplayPreserved: true,
      inputOverflowEvents: 0,
      inputHighWaterMark: 0,
      hits: 10,
      shots: 12,
      misses: 2,
      accuracyPercentage: 83.33,
      killsPerSecond: 0.17,
    },
  };
}

function stubStored(value: unknown): void {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: vi.fn(() => JSON.stringify(value)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
  });
}

describe("LocalRunHistory validation", () => {
  it("restores a valid record whose older click summary has no acquisition field", () => {
    stubStored([run()]);

    expect(new LocalRunHistory().getAll("grid")).toHaveLength(1);
  });

  it("drops records with unsafe Overview fields or unknown invalidation reasons", () => {
    stubStored([
      { ...run(), activeDurationMs: "sixty seconds" },
      { ...run(), runId: "bad-reason", invalidationReasons: ["made-up"] },
    ]);

    const history = new LocalRunHistory();
    expect(() => history.getAll("grid")).not.toThrow();
    expect(history.getAll("grid")).toEqual([]);
  });
});
