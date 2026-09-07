import { createPrngV1 } from "@findmysensi/aim-core";

/**
 * Generates 5 candidate sensitivities spread symmetrically around the
 * user's starting value (their current fmsSensitivity, or the Aimlabs
 * Default of 1.0 if they have none saved). The starting value itself is
 * always the middle candidate, so a user who's already well-calibrated
 * gets a real chance to confirm that rather than being pushed elsewhere.
 *
 * The spread is deliberately narrow (+/- 10%). A single blinded block is a
 * noisy sample, and a wide spread lets one lucky block at an extreme win by
 * chance -- which is how a player whose real sensitivity is 0.245 could be
 * told 0.18. Keeping every candidate within 10% bounds that error.
 */
export function generateSensitivityCandidates(
  baseSensitivity: number,
): readonly number[] {
  if (!Number.isFinite(baseSensitivity) || baseSensitivity <= 0) {
    throw new RangeError("Base sensitivity must be a positive finite number.");
  }
  const multipliers = [0.9, 0.95, 1, 1.05, 1.1];
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

/** One blinded block's raw result: a mode, a tested sensitivity, its score. */
export interface ModeCandidateScore {
  readonly modeId: string;
  readonly sensitivity: number;
  readonly score: number;
}

export interface NormalizedSensitivityScore {
  readonly sensitivity: number;
  /** Mean of the per-mode 0..1 normalized scores. */
  readonly normalized: number;
  readonly modesCounted: number;
}

export interface MultiModeRecommendation {
  readonly sensitivity: number;
  readonly confidence: CalibrationConfidence;
  readonly reason: string;
  readonly perSensitivity: readonly NormalizedSensitivityScore[];
}

const CLOSE_ENOUGH = 1e-9;

function nearestTestedSensitivity(
  target: number,
  tested: readonly number[],
): number {
  return tested.reduce((best, value) =>
    Math.abs(value - target) < Math.abs(best - target) ? value : best,
  );
}

function resolveModeWeight(
  modeId: string,
  weights: Readonly<Record<string, number>> | undefined,
): number {
  const raw = weights?.[modeId];
  if (raw === undefined) return 1;
  if (!Number.isFinite(raw) || raw < 0) {
    throw new RangeError(
      `Mode weight for "${modeId}" must be >= 0 and finite.`,
    );
  }
  return raw;
}

export interface AcrossModesOptions {
  readonly startingSensitivity?: number;
  /**
   * Per-mode multiplier on that mode's contribution to the combined score,
   * default 1. Lower a mode when its result says more about raw skill than
   * about which sensitivity fits the player -- e.g. most players track moving
   * targets poorly at every sensitivity, so Tracking is low-signal here. A
   * weight of 0 drops the mode from the recommendation entirely.
   */
  readonly weights?: Readonly<Record<string, number>>;
}

/**
 * Aggregates blinded blocks played across several modes into one
 * recommendation. Raw scores are not comparable between modes (a Smooth Track
 * score and a Gridshot score live on different scales), so each mode's scores
 * are min-max normalized to 0..1 across the candidates *within that mode*,
 * then combined per candidate as a weighted mean (see `options.weights`). This
 * asks "which sensitivity did you do relatively best at, across every mode"
 * rather than trusting one mode.
 *
 * Confidence is the gap between the top and second mean. When it is LOW and a
 * starting sensitivity is supplied, the nearest tested candidate to that
 * starting value is returned instead of a noisy winner.
 */
export function recommendSensitivityAcrossModes(
  scores: readonly ModeCandidateScore[],
  options: AcrossModesOptions = {},
): MultiModeRecommendation {
  if (scores.length < 2) {
    throw new RangeError(
      "At least 2 blinded block results are required to make a recommendation.",
    );
  }

  const byMode = new Map<string, ModeCandidateScore[]>();
  for (const entry of scores) {
    const list = byMode.get(entry.modeId) ?? [];
    list.push(entry);
    byMode.set(entry.modeId, list);
  }

  // sensitivity -> weighted sum of normalized scores and the weight total.
  const perSensitivity = new Map<
    number,
    { weighted: number; weight: number; modes: number }
  >();
  const countedModes: string[] = [];
  for (const [modeId, modeScores] of byMode) {
    const weight = resolveModeWeight(modeId, options.weights);
    if (weight === 0) continue;
    countedModes.push(modeId);
    const values = modeScores.map((s) => s.score);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    for (const s of modeScores) {
      const normalized = span < CLOSE_ENOUGH ? 0.5 : (s.score - min) / span;
      const bucket = perSensitivity.get(s.sensitivity) ?? {
        weighted: 0,
        weight: 0,
        modes: 0,
      };
      bucket.weighted += normalized * weight;
      bucket.weight += weight;
      bucket.modes += 1;
      perSensitivity.set(s.sensitivity, bucket);
    }
  }

  if (perSensitivity.size === 0) {
    throw new RangeError("Every mode was excluded by a zero weight.");
  }

  const ranked: NormalizedSensitivityScore[] = [...perSensitivity.entries()]
    .map(([sensitivity, bucket]) => ({
      sensitivity,
      normalized: bucket.weight > 0 ? bucket.weighted / bucket.weight : 0.5,
      modesCounted: bucket.modes,
    }))
    .sort((a, b) => b.normalized - a.normalized);

  const winner = ranked[0]!;
  const runnerUp = ranked[1] ?? winner;
  const gap = winner.normalized - runnerUp.normalized;
  const modeCount = countedModes.length;

  const confidence: CalibrationConfidence =
    gap >= 0.15 ? "HIGH" : gap >= 0.06 ? "MODERATE" : "LOW";

  const testedSensitivities = ranked.map((r) => r.sensitivity);
  const modeList = countedModes.join(", ");

  if (confidence === "LOW" && options.startingSensitivity !== undefined) {
    const kept = nearestTestedSensitivity(
      options.startingSensitivity,
      testedSensitivities,
    );
    return {
      sensitivity: kept,
      confidence,
      reason: `Results across ${modeCount} modes (${modeList}) were too close to separate. Keeping your current sensitivity, ${kept}.`,
      perSensitivity: ranked,
    };
  }

  return {
    sensitivity: winner.sensitivity,
    confidence,
    reason: `${winner.sensitivity} had the best combined result across ${modeCount} modes (${modeList}), ${gap.toFixed(2)} ahead of the next candidate on normalized score.`,
    perSensitivity: ranked,
  };
}
