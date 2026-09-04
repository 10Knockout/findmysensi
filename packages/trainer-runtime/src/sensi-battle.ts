import { createPrngV1 } from "@findmysensi/aim-core";
import type { CalibrationConfidence } from "./find-my-sensi.js";

/**
 * Sensi Battle: an objective, counterbalanced A/B comparison between two
 * sensitivities. Unlike Find My Sensi (which sweeps 5 candidates around a
 * base value), Battle takes two arbitrary candidates the user names
 * themselves and decides which performed better -- or admits it can't tell,
 * rather than fabricating a preference from a coin-flip-sized gap.
 */

export type BattleCandidateId = "A" | "B";

export interface BattleResult {
  readonly id: BattleCandidateId;
  readonly accuracyPercentage: number;
}

export type BattleWinner = BattleCandidateId | "COULD_NOT_TELL";

export interface BattleDecision {
  readonly winner: BattleWinner;
  readonly confidence: CalibrationConfidence;
  readonly reason: string;
}

/**
 * Deterministically decides which candidate's practice block runs first,
 * from a seed, so block order is counterbalanced across a session rather
 * than always running A first (which would confound results with
 * fatigue/warm-up favoring whichever candidate goes second).
 */
export function buildBattleOrder(
  seed: readonly [number, number, number, number],
): readonly [BattleCandidateId, BattleCandidateId] {
  const prng = createPrngV1(seed);
  return prng.nextRange(0, 2) === 0 ? ["A", "B"] : ["B", "A"];
}

/**
 * Decides the winner of a Sensi Battle round from the two candidates'
 * measured accuracy. A gap under 3 points is treated as noise -- not
 * enough evidence to declare a winner, so it reports COULD_NOT_TELL
 * instead of fabricating one. This mirrors recommendSensitivity's
 * confidence tiers but adds the tie/insufficient-evidence case Battle's
 * two-candidate format specifically calls for.
 */
export function decideBattle(a: BattleResult, b: BattleResult): BattleDecision {
  const gap = Math.abs(a.accuracyPercentage - b.accuracyPercentage);

  if (gap < 3) {
    return {
      winner: "COULD_NOT_TELL",
      confidence: "LOW",
      reason: `The two candidates scored within ${gap.toFixed(1)} accuracy points of each other -- too close to call a winner.`,
    };
  }

  const winner = a.accuracyPercentage > b.accuracyPercentage ? a : b;
  const loser = winner === a ? b : a;
  const confidence: CalibrationConfidence = gap < 8 ? "MODERATE" : "HIGH";

  return {
    winner: winner.id,
    confidence,
    reason: `Candidate ${winner.id} scored ${winner.accuracyPercentage.toFixed(1)}% accuracy vs ${loser.accuracyPercentage.toFixed(1)}% for ${loser.id}, a ${gap.toFixed(1)}-point gap.`,
  };
}
