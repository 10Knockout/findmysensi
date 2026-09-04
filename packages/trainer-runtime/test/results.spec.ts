import { describe, expect, it } from "vitest";
import type { PracticeSummaryRecord } from "../src/results.js";

describe("PracticeSummaryRecord discriminated union", () => {
  it("accepts a grid-mode summary with the exact legacy flat field set", () => {
    const record: PracticeSummaryRecord = {
      id: "run-1",
      modeId: "grid",
      timestamp: 1_000_000,
      score: 54_000,
      hits: 60,
      shots: 65,
      misses: 5,
      accuracyPercentage: 92.3,
      durationSeconds: 60,
      killsPerSecond: 1.0,
      exactReplayPreserved: true,
      inputOverflowEvents: 0,
      inputHighWaterMark: 12,
    };

    expect(record.modeId).toBe("grid");
    expect(record.hits).toBe(60);
  });

  it.each(["pinpoint", "multi", "headline"] as const)(
    "accepts a %s click-mode summary",
    (modeId) => {
      const record: PracticeSummaryRecord = {
        id: `run-${modeId}`,
        modeId,
        timestamp: 1_000_000,
        score: 1_000,
        hits: 1,
        shots: 1,
        misses: 0,
        accuracyPercentage: 100,
        durationSeconds: 60,
        killsPerSecond: 1 / 60,
        exactReplayPreserved: true,
        inputOverflowEvents: 0,
        inputHighWaterMark: 1,
      };

      expect(record.modeId).toBe(modeId);
    },
  );
});
