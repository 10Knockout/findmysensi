import { describe, expect, it } from "vitest";
import {
  computeSkillBenchmarks,
  type PracticeSummaryRecord,
} from "../src/index.js";

function clickRun(
  modeId: "grid" | "headline" | "pinpoint",
  accuracyPercentage: number,
): PracticeSummaryRecord {
  return {
    id: `${modeId}-${accuracyPercentage}`,
    modeId,
    timestamp: 1,
    score: 100,
    durationSeconds: 60,
    exactReplayPreserved: true,
    inputOverflowEvents: 0,
    inputHighWaterMark: 1,
    hits: 1,
    shots: 1,
    misses: 0,
    accuracyPercentage,
    killsPerSecond: 1,
  };
}

describe("computeSkillBenchmarks", () => {
  it("averages accuracy within a category from its click-family modes only", () => {
    const history = [clickRun("grid", 80), clickRun("headline", 90)];
    const result = computeSkillBenchmarks(history);
    expect(result.flick?.averageAccuracyPercentage).toBe(85);
    expect(result.flick?.rank.name).toBeDefined();
    expect(result.flick?.contributingModeIds).toEqual(["grid", "headline"]);
  });

  it("returns null for a category with no contributing runs, not a fake zero", () => {
    const result = computeSkillBenchmarks([]);
    expect(result.flick).toBeNull();
    expect(result.precision).toBeNull();
    expect(result.switching).toBeNull();
    expect(result.tracking).toBeNull();
  });

  it("keeps categories independent", () => {
    const history = [clickRun("grid", 100), clickRun("pinpoint", 20)];
    const result = computeSkillBenchmarks(history);
    expect(result.flick?.averageAccuracyPercentage).toBe(100);
    expect(result.precision?.averageAccuracyPercentage).toBe(20);
  });
});
