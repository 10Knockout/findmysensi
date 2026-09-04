import { describe, expect, it } from "vitest";
import {
  AVATAR_OPTIONS,
  FRAME_TIERS,
  bestAccuracyFromHistory,
  frameForAccuracy,
  titleForAccuracy,
} from "../src/cosmetics.js";
import { RANK_TIERS } from "../src/ranks.js";
import type { PracticeSummaryRecord } from "../src/results.js";

function grid(accuracyPercentage: number): PracticeSummaryRecord {
  return {
    modeId: "grid",
    id: "r",
    timestamp: 0,
    score: 0,
    durationSeconds: 60,
    exactReplayPreserved: true,
    inputOverflowEvents: 0,
    inputHighWaterMark: 0,
    hits: 0,
    shots: 0,
    misses: 0,
    accuracyPercentage,
    killsPerSecond: 0,
  };
}

describe("AVATAR_OPTIONS", () => {
  it("has a curated, non-empty, uniquely-id'd preset list", () => {
    expect(AVATAR_OPTIONS.length).toBeGreaterThanOrEqual(8);
    const ids = new Set(AVATAR_OPTIONS.map((a) => a.id));
    expect(ids.size).toBe(AVATAR_OPTIONS.length);
  });
});

describe("FRAME_TIERS", () => {
  it("has exactly one frame per rank tier", () => {
    expect(FRAME_TIERS.length).toBe(RANK_TIERS.length);
  });
});

describe("frameForAccuracy", () => {
  it("returns the Iron frame for 0% accuracy", () => {
    expect(frameForAccuracy(0).rankName).toBe("Iron");
  });

  it("returns the Elite frame for 99%+ accuracy", () => {
    expect(frameForAccuracy(99).rankName).toBe("Elite");
  });

  it("matches rankForAccuracy's tier boundaries", () => {
    expect(frameForAccuracy(67.9).rankName).toBe("Silver");
    expect(frameForAccuracy(68).rankName).toBe("Gold");
  });
});

describe("titleForAccuracy", () => {
  it("derives a non-empty title from the rank tier", () => {
    expect(titleForAccuracy(0).length).toBeGreaterThan(0);
    expect(titleForAccuracy(99)).toContain("Elite");
  });
});

describe("bestAccuracyFromHistory", () => {
  it("returns 0 for empty or non-click history", () => {
    expect(bestAccuracyFromHistory([])).toBe(0);
  });

  it("returns the highest real accuracy across click-based runs", () => {
    const history = [grid(70), grid(95), grid(82)];
    expect(bestAccuracyFromHistory(history)).toBe(95);
  });
});
