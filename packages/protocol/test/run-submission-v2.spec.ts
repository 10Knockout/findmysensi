import { describe, expect, it } from "vitest";
import {
  LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2,
  PracticeRunSubmissionResponseV2Schema,
  PracticeRunSubmissionV2Schema,
  calculateLeaderboardPercentileV2,
  type PracticeRunSubmissionV2,
} from "../src/index.js";

function validClickRun(): PracticeRunSubmissionV2 {
  return {
    protocolVersion: 2,
    runClass: "practice",
    runId: "practice-018f47a5-3d7b-7c2e-b7a6-2e6cf59b18e4",
    modeId: "grid",
    scenarioVersion: 0,
    scoringVersion: 0,
    analyticsVersion: 1,
    seed: [1, 2, 3, 0xffffffff],
    startedAt: 1_000,
    completedAt: 61_000,
    activeDurationMs: 60_000,
    finalScore: 9_000,
    clientEligibility: {
      leaderboardEligible: true,
      invalidationReasons: [],
    },
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
      rawPointerInputAccepted: true,
      platform: "Windows",
      browser: "Chrome",
      medianRenderFps: null,
      p95FrameTimeMs: null,
      inputOverflowEvents: 0,
      inputHighWaterMark: 0,
    },
    summary: {
      id: "practice-018f47a5-3d7b-7c2e-b7a6-2e6cf59b18e4",
      modeId: "grid",
      timestamp: 61_000,
      score: 9_000,
      durationSeconds: 60,
      exactReplayPreserved: true,
      inputOverflowEvents: 0,
      inputHighWaterMark: 12,
      hits: 90,
      shots: 100,
      misses: 10,
      accuracyPercentage: 90,
      killsPerSecond: 1.5,
      averageAcquisitionTicks: 32,
    },
  };
}

describe("Protocol V2 practice run submission", () => {
  it("accepts a coherent strict practice run", () => {
    expect(PracticeRunSubmissionV2Schema.parse(validClickRun())).toEqual(
      validClickRun(),
    );
  });

  it("rejects unknown fields instead of silently dropping them", () => {
    const run = { ...validClickRun(), trustedByClient: true };
    expect(PracticeRunSubmissionV2Schema.safeParse(run).success).toBe(false);
  });

  it("does not expose a client-selectable competitive run class", () => {
    const run = { ...validClickRun(), runClass: "competitive" };
    expect(PracticeRunSubmissionV2Schema.safeParse(run).success).toBe(false);
  });

  it("rejects internally inconsistent scores and click totals", () => {
    const run = validClickRun();
    const result = PracticeRunSubmissionV2Schema.safeParse({
      ...run,
      finalScore: run.finalScore + 1,
      summary: { ...run.summary, misses: 11 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a mismatched completion timestamp and unsupported sensitivity", () => {
    const run = validClickRun();
    expect(
      PracticeRunSubmissionV2Schema.safeParse({
        ...run,
        summary: { ...run.summary, timestamp: run.completedAt - 1 },
      }).success,
    ).toBe(false);
    expect(
      PracticeRunSubmissionV2Schema.safeParse({
        ...run,
        settings: { ...run.settings, fmsSensitivity: "0" },
      }).success,
    ).toBe(false);
  });

  it("accepts tracking metrics but rejects impossible on-target time", () => {
    const run = validClickRun();
    const tracking = {
      ...run,
      modeId: "strafe",
      summary: {
        id: run.runId,
        modeId: "strafe",
        timestamp: run.completedAt,
        score: run.finalScore,
        durationSeconds: 60,
        exactReplayPreserved: true,
        inputOverflowEvents: 0,
        inputHighWaterMark: 0,
        onTargetTicks: 6_400,
        totalTicks: 7_680,
        onTargetPercentage: (6_400 / 7_680) * 100,
        averageErrorUnits: 40_000,
        maxErrorUnits: 100_000,
      },
    };
    expect(PracticeRunSubmissionV2Schema.safeParse(tracking).success).toBe(
      true,
    );

    const impossible = {
      ...tracking,
      summary: { ...tracking.summary, onTargetTicks: 8_000 },
    };
    expect(PracticeRunSubmissionV2Schema.safeParse(impossible).success).toBe(
      false,
    );
  });

  it("requires eligibility and reason codes to agree", () => {
    const run = validClickRun();
    expect(
      PracticeRunSubmissionV2Schema.safeParse({
        ...run,
        clientEligibility: {
          leaderboardEligible: false,
          invalidationReasons: [],
        },
      }).success,
    ).toBe(false);
  });

  it("models a practice-only response without inventing a standing", () => {
    expect(
      PracticeRunSubmissionResponseV2Schema.safeParse({
        protocolVersion: 2,
        runId: validClickRun().runId,
        submissionStatus: "stored",
        runClass: "practice",
        competitiveStatus: "practice-only",
        leaderboard: {
          board: {
            boardId: "grid:scenario-0:scoring-0",
            modeId: "grid",
            scenarioVersion: 0,
            scoringVersion: 0,
          },
          totalPlayers: 0,
          percentileMinimumPlayers: LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2,
          standing: null,
        },
      }).success,
    ).toBe(true);
  });

  it("accepts both the transitional and the new competitiveStatus", () => {
    const base = {
      protocolVersion: 2,
      runId: validClickRun().runId,
      submissionStatus: "stored",
      runClass: "practice",
      leaderboard: {
        board: {
          boardId: "grid:scenario-0:scoring-0",
          modeId: "grid",
          scenarioVersion: 0,
          scoringVersion: 0,
        },
        totalPlayers: 0,
        percentileMinimumPlayers: LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2,
        standing: null,
      },
    } as const;
    expect(
      PracticeRunSubmissionResponseV2Schema.safeParse({
        ...base,
        competitiveStatus: "practice-only",
      }).success,
    ).toBe(true);
    expect(
      PracticeRunSubmissionResponseV2Schema.safeParse({
        ...base,
        competitiveStatus: "listed",
      }).success,
    ).toBe(true);
    expect(
      PracticeRunSubmissionResponseV2Schema.safeParse({
        ...base,
        competitiveStatus: "ranked",
      }).success,
    ).toBe(false);
  });

  it("rejects a standing whose population or percentile is inconsistent", () => {
    const response = {
      protocolVersion: 2,
      runId: validClickRun().runId,
      submissionStatus: "stored",
      runClass: "practice",
      competitiveStatus: "practice-only",
      leaderboard: {
        board: {
          boardId: "grid:scenario-0:scoring-0",
          modeId: "grid",
          scenarioVersion: 0,
          scoringVersion: 0,
        },
        totalPlayers: 10,
        percentileMinimumPlayers: LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2,
        standing: {
          rank: 2,
          score: 1_000,
          percentile: 50,
          totalPlayers: 9,
          achievedAt: "2026-09-08T00:00:00.000Z",
        },
      },
    };

    expect(
      PracticeRunSubmissionResponseV2Schema.safeParse(response).success,
    ).toBe(false);
  });
});

describe("Protocol V2 leaderboard percentile", () => {
  it("uses unique-player rank endpoints once the population floor is met", () => {
    const players = LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2;
    expect(calculateLeaderboardPercentileV2(1, players)).toBe(100);
    expect(calculateLeaderboardPercentileV2(players, players)).toBe(0);
  });

  it("withholds percentile below the declared population floor", () => {
    expect(
      calculateLeaderboardPercentileV2(
        1,
        LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2 - 1,
      ),
    ).toBeNull();
  });
});
