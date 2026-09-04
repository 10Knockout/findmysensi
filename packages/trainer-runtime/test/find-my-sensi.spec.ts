import { describe, expect, it } from "vitest";
import {
  buildCandidateOrder,
  generateSensitivityCandidates,
  recommendSensitivity,
  type CandidateResult,
} from "../src/find-my-sensi.js";

describe("generateSensitivityCandidates", () => {
  it("generates 5 candidates spread around the starting sensitivity, ascending", () => {
    const candidates = generateSensitivityCandidates(0.2);
    expect(candidates.length).toBe(5);
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i]!).toBeGreaterThan(candidates[i - 1]!);
    }
    // Middle candidate is the starting value itself.
    expect(candidates[2]).toBeCloseTo(0.2, 5);
  });

  it("rejects a non-positive starting sensitivity", () => {
    expect(() => generateSensitivityCandidates(0)).toThrow();
    expect(() => generateSensitivityCandidates(-1)).toThrow();
  });
});

describe("buildCandidateOrder", () => {
  it("is a permutation of all candidate indices", () => {
    const order = buildCandidateOrder(5, [1, 2, 3, 4]);
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it("is deterministic for the same seed", () => {
    const orderA = buildCandidateOrder(5, [9, 9, 9, 9]);
    const orderB = buildCandidateOrder(5, [9, 9, 9, 9]);
    expect(orderA).toEqual(orderB);
  });
});

function result(
  sensitivity: number,
  accuracyPercentage: number,
): CandidateResult {
  return { sensitivity, accuracyPercentage };
}

describe("recommendSensitivity", () => {
  it("recommends the tested candidate with the highest accuracy", () => {
    const results = [result(0.15, 70), result(0.175, 92), result(0.2, 80)];
    const rec = recommendSensitivity(results);
    expect(rec.sensitivity).toBe(0.175);
    expect(rec.reason).toContain("92");
  });

  it("reports HIGH confidence when the winner clearly leads", () => {
    const results = [result(0.15, 60), result(0.175, 95), result(0.2, 65)];
    expect(recommendSensitivity(results).confidence).toBe("HIGH");
  });

  it("reports LOW confidence when the top two are within 3 points", () => {
    const results = [result(0.15, 60), result(0.175, 90), result(0.2, 89)];
    expect(recommendSensitivity(results).confidence).toBe("LOW");
  });

  it("throws rather than fabricating a recommendation with fewer than 2 results", () => {
    expect(() => recommendSensitivity([result(0.175, 90)])).toThrow();
  });
});
