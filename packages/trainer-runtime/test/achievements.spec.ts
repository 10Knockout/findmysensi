import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_DEFINITIONS,
  evaluateAchievements,
  type LifetimeStats,
} from "../src/achievements.js";
import type { PracticeSummaryRecord } from "../src/results.js";

function grid(
  overrides: Partial<Extract<PracticeSummaryRecord, { modeId: "grid" }>> = {},
): PracticeSummaryRecord {
  return {
    modeId: "grid",
    id: "r1",
    timestamp: 0,
    score: 1000,
    durationSeconds: 60,
    exactReplayPreserved: true,
    inputOverflowEvents: 0,
    inputHighWaterMark: 0,
    hits: 45,
    shots: 50,
    misses: 5,
    accuracyPercentage: 90,
    killsPerSecond: 0.75,
    ...overrides,
  };
}

function smoothTrack(
  overrides: Partial<
    Extract<PracticeSummaryRecord, { modeId: "smooth-track" }>
  > = {},
): PracticeSummaryRecord {
  return {
    modeId: "smooth-track",
    id: "r2",
    timestamp: 0,
    score: 500,
    durationSeconds: 60,
    exactReplayPreserved: true,
    inputOverflowEvents: 0,
    inputHighWaterMark: 0,
    onTargetTicks: 6000,
    totalTicks: 7680,
    onTargetPercentage: 78,
    averageErrorUnits: 100,
    maxErrorUnits: 500,
    ...overrides,
  };
}

const ZERO_LIFETIME: LifetimeStats = {
  totalSessions: 0,
  totalShots: 0,
  totalPracticeSeconds: 0,
};

function lifetime(overrides: Partial<LifetimeStats> = {}): LifetimeStats {
  return { ...ZERO_LIFETIME, ...overrides };
}

describe("ACHIEVEMENT_DEFINITIONS", () => {
  it("has 20-30 achievements with unique ids", () => {
    expect(ACHIEVEMENT_DEFINITIONS.length).toBeGreaterThanOrEqual(20);
    expect(ACHIEVEMENT_DEFINITIONS.length).toBeLessThanOrEqual(30);
    const ids = new Set(ACHIEVEMENT_DEFINITIONS.map((a) => a.id));
    expect(ids.size).toBe(ACHIEVEMENT_DEFINITIONS.length);
  });
});

describe("evaluateAchievements", () => {
  it("unlocks nothing for empty history and zero lifetime stats", () => {
    const unlocked = evaluateAchievements([], ZERO_LIFETIME);
    expect(unlocked.size).toBe(0);
  });

  it("unlocks a first-session achievement after one lifetime session", () => {
    const unlocked = evaluateAchievements(
      [grid()],
      lifetime({ totalSessions: 1 }),
    );
    expect(unlocked.has("first-session")).toBe(true);
  });

  it("does not unlock a 10-session achievement after only one lifetime session", () => {
    const unlocked = evaluateAchievements(
      [grid()],
      lifetime({ totalSessions: 1 }),
    );
    expect(unlocked.has("sessions-10")).toBe(false);
  });

  it("unlocks volume achievements from lifetime stats, not the capped history window", () => {
    // Only 1 record visible in the (capped) history array, but lifetime
    // counters say 200 sessions / 25000 shots / 10 hours really happened.
    const unlocked = evaluateAchievements(
      [grid()],
      lifetime({
        totalSessions: 200,
        totalShots: 25000,
        totalPracticeSeconds: 36000,
      }),
    );
    expect(unlocked.has("sessions-200")).toBe(true);
    expect(unlocked.has("shots-25000")).toBe(true);
    expect(unlocked.has("practice-10hr")).toBe(true);
  });

  it("unlocks a high-accuracy achievement only from a real >=95% run", () => {
    const low = evaluateAchievements(
      [grid({ accuracyPercentage: 90 })],
      lifetime({ totalSessions: 1 }),
    );
    expect(low.has("accuracy-95")).toBe(false);

    const high = evaluateAchievements(
      [grid({ accuracyPercentage: 96 })],
      lifetime({ totalSessions: 1 }),
    );
    expect(high.has("accuracy-95")).toBe(true);
  });

  it("unlocks a tracking-focused achievement from smooth-track data", () => {
    const unlocked = evaluateAchievements(
      [smoothTrack({ onTargetPercentage: 82 })],
      lifetime({ totalSessions: 1 }),
    );
    expect(unlocked.has("tracking-75")).toBe(true);
  });

  it("never unlocks based on fabricated data -- only what's in history/lifetime", () => {
    const unlocked = evaluateAchievements(
      [grid({ shots: 10, hits: 1 })],
      lifetime({ totalSessions: 1, totalShots: 10 }),
    );
    expect(unlocked.has("accuracy-95")).toBe(false);
    expect(unlocked.has("tracking-75")).toBe(false);
    expect(unlocked.has("shots-500")).toBe(false);
  });
});
