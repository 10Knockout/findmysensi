import { describe, expect, it } from "vitest";
import {
  createDefaultProcessingPolicy,
  InputProcessingPolicy,
  InputProcessingPreset,
} from "../src/processing-policy.js";
import { DrainStats } from "../src/ring-buffer.js";
import { evaluateInputHealth } from "../src/run-health.js";

describe("Input Processing Policies and Preset Safety", () => {
  const policy: InputProcessingPolicy = createDefaultProcessingPolicy();

  it("scales capacity according to preset while maintaining invariant that sensitivity is unaffected", () => {
    const presets: InputProcessingPreset[] = [
      "auto",
      1000,
      2000,
      4000,
      8000,
      "maximum",
    ];

    const capacities = presets.map((p) => policy.getEffectiveCapacity(p, 1000));
    expect(capacities).toEqual([2048, 2048, 4096, 8192, 16384, 32768]);

    // Auto adjusts capacity dynamically based on observed polling rate
    expect(policy.getEffectiveCapacity("auto", 500)).toBe(2048);
    expect(policy.getEffectiveCapacity("auto", 1500)).toBe(4096);
    expect(policy.getEffectiveCapacity("auto", 3800)).toBe(8192);
    expect(policy.getEffectiveCapacity("auto", 7500)).toBe(16384);
  });

  it("enforces bounded hard processing budgets for batch drain work", () => {
    expect(policy.getEffectiveBatchBudgetMs(1000)).toBe(1.0);
    expect(policy.getEffectiveBatchBudgetMs(8000)).toBe(2.5);
    expect(policy.getEffectiveBatchBudgetMs("maximum")).toBe(4.0);
  });

  describe("Ranked Path Health Evaluation & Preflight Rejection", () => {
    it("approves healthy input streams with zero dropped precision", () => {
      const stats: DrainStats = {
        drainedCount: 128,
        highWaterMark: 30,
        overflowCount: 0,
        lostTemporalPrecision: false,
      };

      const health = evaluateInputHealth(stats, 1000, 1000, 2048);
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

      const health = evaluateInputHealth(stats, 1000, 1000, 2048);
      expect(health.isStableForRanked).toBe(false);
      expect(health.lostTemporalPrecision).toBe(true);
      expect(health.overflowCount).toBe(12);
      expect(health.rejectionReason).toContain("overflow");
    });

    it("fails Ranked preflight when manual preset is overwhelmed by high-poll input", () => {
      const stats: DrainStats = {
        drainedCount: 8000,
        highWaterMark: 2000, // Dangerously close to 2048 cap
        overflowCount: 0,
        lostTemporalPrecision: false,
      };

      // 8000 Hz input into a 1000 Hz capacity buffer (2048) with high watermark > 95%
      const health = evaluateInputHealth(stats, 1000, 1000, 2048);
      expect(health.isStableForRanked).toBe(false);
      expect(health.rejectionReason).toContain("near saturation");
    });
  });
});
