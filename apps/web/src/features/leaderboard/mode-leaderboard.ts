import type { LeaderboardResponseV2 } from "@findmysensi/protocol";
import { gamerTagLabel } from "@findmysensi/trainer-runtime";

export interface LeaderboardViewerProfile {
  readonly username: string;
  readonly avatarId?: string;
  readonly frameId?: string;
  readonly tagId?: string;
}

export interface LeaderboardViewRow {
  readonly rank: number;
  readonly username: string;
  readonly avatarId: string;
  readonly frameId: string;
  readonly tag: string | null;
  readonly score: string;
  readonly accuracy: string;
  readonly isSelf: boolean;
}

export interface LeaderboardView {
  readonly rows: readonly LeaderboardViewRow[];
  readonly selfOutsideList: LeaderboardViewRow | null;
  readonly totalPlayers: number;
  readonly percentileLabel: string | null;
  readonly seasonLabel: string;
  readonly resetLabel: string | null;
}

// Fixed locale keeps grouping deterministic across the CI node runtime and
// every visitor's browser (the score screen the player just came from renders
// the same "151,200" grouping).
function formatScore(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatAccuracy(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(1)}%`;
}

function formatSeason(seasonId: string | undefined): string {
  if (!seasonId) return "Current board";
  const [year, month] = seasonId.split("-").map(Number);
  if (!year || !month) return seasonId;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatReset(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function buildLeaderboardView(
  response: LeaderboardResponseV2,
  viewer: LeaderboardViewerProfile | string | null,
): LeaderboardView {
  const viewerProfile =
    typeof viewer === "string" ? { username: viewer } : viewer;
  const rows: LeaderboardViewRow[] = response.rows.map((row) => ({
    rank: row.rank,
    username: row.username,
    avatarId: row.avatarId ?? "avatar-default",
    frameId: row.frameId ?? "frame-none",
    tag: gamerTagLabel(row.tagId ?? "tag-none"),
    score: formatScore(row.score),
    accuracy: formatAccuracy(row.accuracyPercentage),
    isSelf: viewerProfile !== null && row.username === viewerProfile.username,
  }));

  const standing = response.standing;
  const listed = rows.some((row) => row.isSelf);
  const selfOutsideList: LeaderboardViewRow | null =
    standing && viewerProfile && !listed
      ? {
          rank: standing.rank,
          username: viewerProfile.username,
          avatarId: viewerProfile.avatarId ?? "avatar-default",
          frameId: viewerProfile.frameId ?? "frame-none",
          tag: gamerTagLabel(viewerProfile.tagId ?? "tag-none"),
          score: formatScore(standing.score),
          accuracy: formatAccuracy(standing.accuracyPercentage),
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
    seasonLabel: formatSeason(response.board.seasonId),
    resetLabel: formatReset(response.board.seasonEndsAt),
  };
}
