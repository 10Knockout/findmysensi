import { describe, expect, it } from "vitest";
import {
  createDefaultProcessingPolicy,
  InputProcessingPolicy,
  SAFE_INPUT_BATCH_BUDGET_MS,
  SAFE_INPUT_BUFFER_CAPACITY,
} from "../src/processing-policy.js";
import { DrainStats } from "../src/ring-buffer.js";
import { evaluateInputHealth } from "../src/run-health.js";

describe("Input Processing Policy (no user-facing preset)", () => {
  const policy: InputProcessingPolicy = createDefaultProcessingPolicy();

  it("always allocates the safe, 8000 Hz-capable buffer regardless of caller", () => {
    expect(policy.getEffectiveCapacity()).toBe(SAFE_INPUT_BUFFER_CAPACITY);
    expect(policy.getEffectiveCapacity()).toBe(16_384);
  });

  it("enforces a bounded hard processing budget for batch drain work", () => {
    expect(policy.getEffectiveBatchBudgetMs()).toBe(SAFE_INPUT_BATCH_BUDGET_MS);
    expect(policy.getEffectiveBatchBudgetMs()).toBe(2.5);
  });

  describe("Ranked Path Health Evaluation & Preflight Rejection", () => {
    it("approves healthy input streams with zero dropped precision", () => {
      const stats: DrainStats = {
        drainedCount: 128,
        highWaterMark: 30,
        overflowCount: 0,
        lostTemporalPrecision: false,
      };

      const health = evaluateInputHealth(stats, 1000, 2048);
      expect(health.isStableForRanked).toBe(true);
      expect(health.observedRateHz).toBe(128);
      expect(health.rejectionReason).toBeUndefined();
    });

    it("fails Ranked preflight if ring buffer experienced precision loss / overflow", () => {
      const stats: DrainStats = {
        drainedCount: 2048,
        highWaterMark: 2048,
        overflowCount: 12,
        lostTemporalPrecision: true,
      };

      const health = evaluateInputHealth(stats, 1000, 2048);
      expect(health.isStableForRanked).toBe(false);
      expect(health.lostTemporalPrecision).toBe(true);
      expect(health.overflowCount).toBe(12);
      expect(health.rejectionReason).toContain("overflow");
    });

    it("fails Ranked preflight when the buffer is overwhelmed by high-poll input", () => {
      const stats: DrainStats = {
        drainedCount: 8000,
        highWaterMark: 2000, // Dangerously close to a 2048 cap
        overflowCount: 0,
        lostTemporalPrecision: false,
      };

      const health = evaluateInputHealth(stats, 1000, 2048);
      expect(health.isStableForRanked).toBe(false);
      expect(health.rejectionReason).toContain("near saturation");
    });
  });
});
