import { describe, expect, it } from "vitest";
import {
  buildCandidateOrder,
  generateSensitivityCandidates,
  recommendSensitivity,
  recommendSensitivityAcrossModes,
  type CandidateResult,
  type ModeCandidateScore,
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

  it("keeps every candidate within 10% of the starting sensitivity", () => {
    const candidates = generateSensitivityCandidates(0.245);
    expect(candidates[0]).toBeCloseTo(0.245 * 0.9, 6);
    expect(candidates[4]).toBeCloseTo(0.245 * 1.1, 6);
    for (const c of candidates) {
      expect(Math.abs(c - 0.245) / 0.245).toBeLessThanOrEqual(0.1 + 1e-9);
    }
  });

  it("rejects a non-positive starting sensitivity", () => {
    expect(() => generateSensitivityCandidates(0)).toThrow();
    expect(() => generateSensitivityCandidates(-1)).toThrow();
  });
});

describe("recommendSensitivityAcrossModes", () => {
  function block(
    modeId: string,
    sensitivity: number,
    score: number,
  ): ModeCandidateScore {
    return { modeId, sensitivity, score };
  }

  it("normalizes each mode independently before combining", () => {
    // grid scores in the tens of thousands, tracking in the hundreds; 0.24
    // is best in both, so it must win despite the raw-scale difference.
    const scores = [
      block("grid", 0.22, 20000),
      block("grid", 0.24, 41000),
      block("grid", 0.26, 25000),
      block("smooth-track", 0.22, 300),
      block("smooth-track", 0.24, 900),
      block("smooth-track", 0.26, 500),
    ];
    const rec = recommendSensitivityAcrossModes(scores);
    expect(rec.sensitivity).toBe(0.24);
    expect(rec.reason).toContain("2 modes");
    expect(rec.perSensitivity[0]!.normalized).toBeGreaterThan(
      rec.perSensitivity[1]!.normalized,
    );
  });

  it("keeps the starting sensitivity when modes disagree (LOW confidence)", () => {
    const scores = [
      block("grid", 0.22, 100),
      block("grid", 0.24, 101),
      block("grid", 0.26, 99),
      block("reaction", 0.22, 50),
      block("reaction", 0.24, 49),
      block("reaction", 0.26, 51),
    ];
    const rec = recommendSensitivityAcrossModes(scores, {
      startingSensitivity: 0.24,
    });
    expect(rec.confidence).toBe("LOW");
    expect(rec.sensitivity).toBe(0.24);
    expect(rec.reason).toContain("Keeping your current sensitivity");
  });

  it("treats a mode with all-equal scores as neutral, no NaN", () => {
    const scores = [
      block("grid", 0.22, 500),
      block("grid", 0.24, 500),
      block("grid", 0.26, 500),
      block("strafe", 0.22, 10),
      block("strafe", 0.24, 90),
      block("strafe", 0.26, 40),
    ];
    const rec = recommendSensitivityAcrossModes(scores);
    expect(Number.isFinite(rec.perSensitivity[0]!.normalized)).toBe(true);
    expect(rec.sensitivity).toBe(0.24);
  });

  it("throws with fewer than 2 blocks", () => {
    expect(() =>
      recommendSensitivityAcrossModes([block("grid", 0.24, 100)]),
    ).toThrow();
  });

  it("lets a mode weight change the combined winner", () => {
    // Tracking points hard at 0.22; grid points at 0.26 but also gives 0.22
    // a little. After normalization every mode spans 0..1 equally.
    const scores = [
      block("smooth-track", 0.22, 10),
      block("smooth-track", 0.24, 0),
      block("smooth-track", 0.26, 0),
      block("grid", 0.22, 2),
      block("grid", 0.24, 0),
      block("grid", 0.26, 10),
    ];
    // Equal weight: 0.22 (1.0 + 0.2) beats 0.26 (0 + 1.0).
    expect(recommendSensitivityAcrossModes(scores).sensitivity).toBe(0.22);
    // Tracking at quarter weight: grid decides, 0.26.
    expect(
      recommendSensitivityAcrossModes(scores, {
        weights: { "smooth-track": 0.25 },
      }).sensitivity,
    ).toBe(0.26);
  });

  it("drops a mode entirely at weight 0", () => {
    const scores = [
      block("grid", 0.22, 10),
      block("grid", 0.24, 90),
      block("grid", 0.26, 40),
      block("smooth-track", 0.22, 90),
      block("smooth-track", 0.24, 10),
      block("smooth-track", 0.26, 40),
    ];
    const rec = recommendSensitivityAcrossModes(scores, {
      weights: { "smooth-track": 0 },
    });
    expect(rec.sensitivity).toBe(0.24);
    expect(rec.reason).not.toContain("smooth-track");
    expect(rec.reason).toContain("grid");
    expect(rec.perSensitivity[0]!.modesCounted).toBe(1);
  });

  it("throws if every mode is weighted to 0", () => {
    expect(() =>
      recommendSensitivityAcrossModes(
        [
          block("grid", 0.22, 1),
          block("grid", 0.24, 2),
          block("grid", 0.26, 3),
        ],
        { weights: { grid: 0 } },
      ),
    ).toThrow();
  });

  it("rejects a negative mode weight", () => {
    expect(() =>
      recommendSensitivityAcrossModes(
        [block("grid", 0.22, 1), block("grid", 0.24, 2)],
        { weights: { grid: -1 } },
      ),
    ).toThrow(RangeError);
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
