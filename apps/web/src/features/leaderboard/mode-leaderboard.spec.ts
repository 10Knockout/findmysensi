import { describe, expect, it } from "vitest";
import type { LeaderboardResponseV2 } from "@findmysensi/protocol";
import { buildLeaderboardView } from "./mode-leaderboard.js";

function response(
  overrides: Partial<LeaderboardResponseV2> = {},
): LeaderboardResponseV2 {
  return {
    protocolVersion: 2,
    board: {
      boardId: "grid:scenario-0:scoring-0",
      modeId: "grid",
      scenarioVersion: 0,
      scoringVersion: 0,
    },
    rows: [
      {
        rank: 1,
        username: "ace",
        avatarId: "neon-sentinel",
        frameId: "neon-green",
        tagId: "one-tap",
        score: 151200,
        accuracyPercentage: 92.45,
        achievedAt: "2026-09-08T00:00:00.000Z",
      },
      {
        rank: 2,
        username: "bee",
        score: 140000,
        achievedAt: "2026-09-08T00:00:00.000Z",
      },
    ],
    totalPlayers: 2,
    percentileMinimumPlayers: 10,
    standing: null,
    ...overrides,
  };
}

describe("buildLeaderboardView", () => {
  it("formats rows and marks the self row", () => {
    const view = buildLeaderboardView(response(), "bee");
    expect(view.rows[0]).toMatchObject({
      rank: 1,
      username: "ace",
      avatarId: "neon-sentinel",
      frameId: "neon-green",
      tag: "One Tap",
      score: "151,200",
      accuracy: "92.5%",
      isSelf: false,
    });
    expect(view.rows[1]?.isSelf).toBe(true);
    expect(view.selfOutsideList).toBeNull();
  });

  it("returns a self-standing line when the player is not in the listed rows", () => {
    const view = buildLeaderboardView(
      response({
        standing: {
          rank: 57,
          score: 90000,
          percentile: null,
          totalPlayers: 2,
          achievedAt: "2026-09-08T00:00:00.000Z",
        },
      }),
      "zed",
    );
    expect(view.selfOutsideList).toMatchObject({
      rank: 57,
      username: "zed",
      score: "90,000",
      isSelf: true,
    });
  });

  it("omits the self-standing line when the player is already listed", () => {
    const view = buildLeaderboardView(
      response({
        standing: {
          rank: 2,
          score: 140000,
          percentile: null,
          totalPlayers: 2,
          achievedAt: "2026-09-08T00:00:00.000Z",
        },
      }),
      "bee",
    );
    expect(view.selfOutsideList).toBeNull();
  });

  it("derives a percentile label only when present", () => {
    expect(buildLeaderboardView(response(), null).percentileLabel).toBeNull();
    const withPct = buildLeaderboardView(
      response({
        standing: {
          rank: 1,
          score: 151200,
          percentile: 92.5,
          totalPlayers: 12,
          achievedAt: "2026-09-08T00:00:00.000Z",
        },
      }),
      "ace",
    );
    expect(withPct.percentileLabel).toBe("Top 7.5%");
  });

  it("handles an anonymous viewer", () => {
    const view = buildLeaderboardView(response(), null);
    expect(view.rows.every((r) => r.isSelf === false)).toBe(true);
    expect(view.selfOutsideList).toBeNull();
  });

  it("formats monthly season and reset metadata", () => {
    const view = buildLeaderboardView(
      response({
        board: {
          boardId: "grid:scenario-0:scoring-0:season-2026-09",
          modeId: "grid",
          scenarioVersion: 0,
          scoringVersion: 0,
          seasonId: "2026-09",
          seasonStartsAt: "2026-09-01T00:00:00.000Z",
          seasonEndsAt: "2026-10-01T00:00:00.000Z",
        },
      }),
      null,
    );
    expect(view.seasonLabel).toBe("September 2026");
    expect(view.resetLabel).toBe("Oct 1, 2026");
  });
});
