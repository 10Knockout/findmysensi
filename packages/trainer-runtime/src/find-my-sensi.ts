import { createPrngV1 } from "@findmysensi/aim-core";

/**
 * Generates 5 candidate sensitivities spread symmetrically around the
 * user's starting value (their current fmsSensitivity, or the Aimlabs
 * Default of 1.0 if they have none saved). The starting value itself is
 * always the middle candidate, so a user who's already well-calibrated
 * gets a real chance to confirm that rather than being pushed elsewhere.
 */
export function generateSensitivityCandidates(
  baseSensitivity: number,
): readonly number[] {
  if (!Number.isFinite(baseSensitivity) || baseSensitivity <= 0) {
    throw new RangeError("Base sensitivity must be a positive finite number.");
  }
  const multipliers = [0.75, 0.875, 1, 1.125, 1.25];
  return Object.freeze(multipliers.map((m) => baseSensitivity * m));
}

/**
 * Deterministically shuffles candidate test order from a seed, so block
 * order is counterbalanced across a session rather than always testing
 * slowest-to-fastest (which would confound results with fatigue/warm-up).
 */
export function buildCandidateOrder(
  candidateCount: number,
  seed: readonly [number, number, number, number],
): readonly number[] {
  const prng = createPrngV1(seed);
  const order = Array.from({ length: candidateCount }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = prng.nextRange(0, i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return Object.freeze(order);
}

export interface CandidateResult {
  readonly sensitivity: number;
  readonly accuracyPercentage: number;
}

export type CalibrationConfidence = "LOW" | "MODERATE" | "HIGH";

export interface SensitivityRecommendation {
  readonly sensitivity: number;
  readonly confidence: CalibrationConfidence;
  readonly reason: string;
}

/**
 * Recommends the tested sensitivity with the highest measured accuracy.
 * Never interpolates a sensitivity that wasn't actually tested, and never
 * fabricates a confidence level -- it's derived from the real accuracy gap
 * between the winner and the runner-up.
 */
export function recommendSensitivity(
  results: readonly CandidateResult[],
): SensitivityRecommendation {
  if (results.length < 2) {
    throw new RangeError(
      "At least 2 candidate results are required to make a recommendation.",
    );
  }

  const sorted = [...results].sort(
    (a, b) => b.accuracyPercentage - a.accuracyPercentage,
  );
  const winner = sorted[0]!;
  const runnerUp = sorted[1]!;
  const gap = winner.accuracyPercentage - runnerUp.accuracyPercentage;

  const confidence: CalibrationConfidence =
    gap < 3 ? "LOW" : gap < 8 ? "MODERATE" : "HIGH";

  return {
    sensitivity: winner.sensitivity,
    confidence,
    reason: `${winner.sensitivity} scored ${winner.accuracyPercentage.toFixed(1)}% accuracy, ${gap.toFixed(1)} points ahead of the next-best candidate tested.`,
  };
}
