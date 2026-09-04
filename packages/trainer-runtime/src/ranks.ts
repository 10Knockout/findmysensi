export interface RankTier {
  readonly name: string;
  readonly minAccuracyPercentage: number;
}

/**
 * v1 rank thresholds, on accuracy percentage (bounded 0-100, unlike raw
 * per-mode score which has no natural scale to anchor thresholds to
 * without real player population data). Provisional: these bands are a
 * reasonable first calibration, not derived from real population
 * percentiles -- there is no live leaderboard yet to derive them from.
 * Revisit once real benchmark data exists (M15).
 */
export const RANK_TIERS: readonly RankTier[] = [
  { name: "Iron", minAccuracyPercentage: 0 },
  { name: "Bronze", minAccuracyPercentage: 40 },
  { name: "Silver", minAccuracyPercentage: 55 },
  { name: "Gold", minAccuracyPercentage: 68 },
  { name: "Platinum", minAccuracyPercentage: 78 },
  { name: "Diamond", minAccuracyPercentage: 86 },
  { name: "Master", minAccuracyPercentage: 92 },
  { name: "Grandmaster", minAccuracyPercentage: 96 },
  { name: "Elite", minAccuracyPercentage: 99 },
];

export function rankForAccuracy(accuracyPercentage: number): RankTier {
  const clamped = Math.max(0, Math.min(100, accuracyPercentage));
  let result = RANK_TIERS[0]!;
  for (const tier of RANK_TIERS) {
    if (clamped >= tier.minAccuracyPercentage) {
      result = tier;
    }
  }
  return result;
}
