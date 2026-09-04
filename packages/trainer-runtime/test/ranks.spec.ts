import { describe, expect, it } from "vitest";
import { RANK_TIERS, rankForAccuracy } from "../src/ranks.js";

describe("rankForAccuracy", () => {
  it("has exactly 9 tiers, Iron through Elite, ascending thresholds", () => {
    expect(RANK_TIERS.map((t) => t.name)).toEqual([
      "Iron",
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Diamond",
      "Master",
      "Grandmaster",
      "Elite",
    ]);
    for (let i = 1; i < RANK_TIERS.length; i++) {
      expect(RANK_TIERS[i]!.minAccuracyPercentage).toBeGreaterThan(
        RANK_TIERS[i - 1]!.minAccuracyPercentage,
      );
    }
  });

  it("returns Iron for 0% accuracy and Elite for 100%", () => {
    expect(rankForAccuracy(0).name).toBe("Iron");
    expect(rankForAccuracy(100).name).toBe("Elite");
  });

  it("returns the tier whose threshold the accuracy meets or exceeds", () => {
    const goldThreshold = RANK_TIERS.find(
      (t) => t.name === "Gold",
    )!.minAccuracyPercentage;
    expect(rankForAccuracy(goldThreshold).name).toBe("Gold");
    expect(rankForAccuracy(goldThreshold - 0.01).name).not.toBe("Gold");
  });

  it("clamps out-of-range input rather than throwing", () => {
    expect(rankForAccuracy(-5).name).toBe("Iron");
    expect(rankForAccuracy(150).name).toBe("Elite");
  });
});
