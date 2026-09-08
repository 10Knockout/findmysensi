import type { LeaderboardResponseV2 } from "@findmysensi/protocol";

export interface LeaderboardViewRow {
  readonly rank: number;
  readonly username: string;
  readonly score: string;
  readonly achievedAt: string;
  readonly isSelf: boolean;
}

export interface LeaderboardView {
  readonly rows: readonly LeaderboardViewRow[];
  readonly selfOutsideList: LeaderboardViewRow | null;
  readonly totalPlayers: number;
  readonly percentileLabel: string | null;
}

// Fixed locale keeps grouping deterministic across the CI node runtime and
// every visitor's browser (the score screen the player just came from renders
// the same "151,200" grouping).
function formatScore(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function buildLeaderboardView(
  response: LeaderboardResponseV2,
  selfUsername: string | null,
): LeaderboardView {
  const rows: LeaderboardViewRow[] = response.rows.map((row) => ({
    rank: row.rank,
    username: row.username,
    score: formatScore(row.score),
    achievedAt: formatDate(row.achievedAt),
    isSelf: selfUsername !== null && row.username === selfUsername,
  }));

  const standing = response.standing;
  const listed = rows.some((row) => row.isSelf);
  const selfOutsideList: LeaderboardViewRow | null =
    standing && selfUsername && !listed
      ? {
          rank: standing.rank,
          username: selfUsername,
          score: formatScore(standing.score),
          achievedAt: formatDate(standing.achievedAt),
          isSelf: true,
        }
      : null;

  const percentileLabel =
    standing && standing.percentile !== null
      ? `Top ${(100 - standing.percentile).toLocaleString("en-US", {
          maximumFractionDigits: 1,
        })}%`
      : null;

  return {
    rows,
    selfOutsideList,
    totalPlayers: response.totalPlayers,
    percentileLabel,
  };
}
