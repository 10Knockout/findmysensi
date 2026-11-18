export const SEASON_RANK_MIN_PLAYERS = 30;

export const SEASON_RANKS = [
  { name: "Grandmaster", topPercent: 1 },
  { name: "Master", topPercent: 3 },
  { name: "Diamond", topPercent: 10 },
  { name: "Platinum", topPercent: 20 },
  { name: "Gold", topPercent: 40 },
  { name: "Silver", topPercent: 60 },
  { name: "Bronze", topPercent: 100 },
] as const;

export function seasonRank(rank: number, totalPlayers: number) {
  if (
    !Number.isInteger(rank) ||
    !Number.isInteger(totalPlayers) ||
    totalPlayers < SEASON_RANK_MIN_PLAYERS ||
    rank < 1 ||
    rank > totalPlayers
  ) {
    return null;
  }

  // Use the exact population share. Rank #1 of 30 is in the top 3.34%.
  return (
    SEASON_RANKS.find((tier) => rank * 100 <= tier.topPercent * totalPlayers) ??
    null
  );
}
