import { describe, expect, it } from "vitest";
import {
  recommendNextExercise,
  type PracticeSummaryRecord,
} from "../src/index.js";

function clickRun(
  modeId: "grid" | "pinpoint" | "multi",
  accuracyPercentage: number,
  timestamp: number,
): PracticeSummaryRecord {
  return {
    id: `${modeId}-${timestamp}`,
    modeId,
    timestamp,
    score: 1000,
    durationSeconds: 60,
    exactReplayPreserved: true,
    inputOverflowEvents: 0,
    inputHighWaterMark: 1,
    hits: 10,
    shots: 20,
    misses: 10,
    accuracyPercentage,
    killsPerSecond: 1,
  };
}

describe("recommendNextExercise", () => {
  it("recommends the click mode with the lowest average accuracy", () => {
    const history: PracticeSummaryRecord[] = [
      clickRun("grid", 90, 1),
      clickRun("pinpoint", 60, 2),
      clickRun("multi", 80, 3),
    ];

    const result = recommendNextExercise(history);
    expect(result?.modeId).toBe("pinpoint");
    expect(result?.reason).toContain("60");
  });

  it("averages accuracy across multiple runs of the same mode", () => {
    const history: PracticeSummaryRecord[] = [
      clickRun("grid", 90, 1),
      clickRun("pinpoint", 40, 2),
      clickRun("pinpoint", 80, 3), // avg pinpoint = 60
      clickRun("multi", 70, 4),
    ];

    const result = recommendNextExercise(history);
    expect(result?.modeId).toBe("pinpoint");
  });

  it("returns null rather than fabricating a recommendation with no history", () => {
    expect(recommendNextExercise([])).toBeNull();
  });

  it("returns null when fewer than two distinct click modes have been played", () => {
    const history: PracticeSummaryRecord[] = [
      clickRun("grid", 90, 1),
      clickRun("grid", 85, 2),
    ];
    expect(recommendNextExercise(history)).toBeNull();
  });
});
