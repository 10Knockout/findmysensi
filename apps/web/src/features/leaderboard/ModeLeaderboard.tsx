"use client";

import { useEffect, useState } from "react";
import { BrowserApiClient } from "@findmysensi/api-client";
import { RANK_TIERS } from "@findmysensi/trainer-runtime";
import { PlayerAvatar } from "../profile/PlayerAvatar.js";
import {
  buildLeaderboardView,
  type LeaderboardView,
  type LeaderboardViewerProfile,
} from "./mode-leaderboard.js";
import { getModeLeaderboardRoutes } from "./routes.js";

interface ModeLeaderboardProps {
  readonly mode: string;
  readonly taskName: string;
  readonly scenarioVersion: number;
  readonly scoringVersion: number;
  readonly embedded?: boolean;
  readonly contained?: boolean;
  readonly showActions?: boolean;
  readonly pageSize?: number;
  readonly refreshKey?: string;
}

type LoadState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "ready";
      readonly view: LeaderboardView;
      readonly hasMore: boolean;
    };

export function ModeLeaderboard({
  mode,
  taskName,
  scenarioVersion,
  scoringVersion,
  embedded = false,
  contained = false,
  showActions = !contained,
  pageSize = embedded ? 10 : 50,
  refreshKey = "",
}: ModeLeaderboardProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [offset, setOffset] = useState(0);
  const routes = getModeLeaderboardRoutes(mode);

  useEffect(() => {
    setOffset(0);
  }, [mode, scenarioVersion, scoringVersion]);

  useEffect(() => {
    let active = true;
    const client = new BrowserApiClient();
    setState({ kind: "loading" });

    void (async () => {
      const [board, session] = await Promise.all([
        client.getLeaderboardV2(mode, scenarioVersion, scoringVersion, {
          limit: pageSize,
          offset,
        }),
        client.getSession().catch(() => null),
      ]);
      if (!active) return;

      if (!board.ok || !board.data) {
        setState({
          kind: "error",
          message: board.error ?? "The leaderboard is unavailable.",
        });
        return;
      }

      let viewer: LeaderboardViewerProfile | null = session?.user?.username
        ? { username: session.user.username }
        : null;
      if (viewer) {
        const profile = await client.getProfileSettings();
        if (!active) return;
        if (profile.ok && profile.data) {
          viewer = profile.data;
        }
      }

      setState({
        kind: "ready",
        view: buildLeaderboardView(board.data, viewer),
        hasMore:
          board.data.page?.hasMore ??
          offset + board.data.rows.length < board.data.totalPlayers,
      });
    })();

    return () => {
      active = false;
    };
  }, [mode, scenarioVersion, scoringVersion, pageSize, offset, refreshKey]);

  const board = (
    <div className={embedded ? "app-leaderboard-embedded" : undefined}>
      <header className="app-results-header">
        <p className="app-section-label">
          {embedded ? "This game leaderboard" : "Leaderboard"}
        </p>
        <h2
          className={embedded ? "app-results-section-heading" : "app-heading"}
        >
          {taskName}
        </h2>
        <p className="app-subtext">
          Best score per player this month. Tied scores share a rank.
        </p>
      </header>

      {state.kind === "loading" ? (
        <p className="app-subtext">Loading leaderboard…</p>
      ) : state.kind === "error" ? (
        <div role="alert" className="app-alert">
          {state.message}
        </div>
      ) : (
        <LeaderboardReadyState
          state={state}
          offset={offset}
          pageSize={pageSize}
          embedded={embedded}
          onPrevious={() =>
            setOffset((current) => Math.max(0, current - pageSize))
          }
          onNext={() => setOffset((current) => current + pageSize)}
        />
      )}

      {!embedded ? (
        <>
          <LeaderboardRules />
          {showActions ? (
            <div className="app-results-actions">
              <a href={routes.play} className="app-button">
                Play this mode
              </a>
              <a href="/leaderboards" className="app-button app-button-ghost">
                All leaderboards
              </a>
              <a href={routes.hub} className="app-button app-button-ghost">
                Return to Hub
              </a>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );

  if (embedded)
    return <section aria-label={`${taskName} leaderboard`}>{board}</section>;
  if (contained) {
    return <article className="app-card app-leaderboard-card">{board}</article>;
  }

  return (
    <main className="app-page app-results-page">
      <div className="app-page-inner app-leaderboard-page-inner">
        <article className="app-card app-card-wide app-leaderboard-card">
          {board}
        </article>
      </div>
    </main>
  );
}

function LeaderboardReadyState({
  state,
  offset,
  pageSize,
  embedded,
  onPrevious,
  onNext,
}: {
  readonly state: Extract<LoadState, { kind: "ready" }>;
  readonly offset: number;
  readonly pageSize: number;
  readonly embedded: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}) {
  const { view } = state;
  const selfRow = view.rows.find((row) => row.isSelf) ?? view.selfOutsideList;

  return (
    <>
      <div className="app-leaderboard-meta">
        <span>{view.seasonLabel}</span>
        <span>{view.totalPlayers.toLocaleString("en-US")} players</span>
        {view.resetLabel ? (
          <span>Resets {view.resetLabel} at 00:00 UTC</span>
        ) : null}
      </div>

      {selfRow ? (
        <div className="app-leaderboard-standing" role="status">
          <span>Your best this month</span>
          <strong>#{selfRow.rank}</strong>
          <span>
            {selfRow.score} points · {selfRow.accuracy} accuracy
          </span>
          {view.percentileLabel ? <span>{view.percentileLabel}</span> : null}
        </div>
      ) : null}

      {view.rows.length === 0 ? (
        <p className="app-subtext">No scores yet. Be the first.</p>
      ) : (
        <LeaderboardTable rows={view.rows} />
      )}

      {view.selfOutsideList ? (
        <div className="app-leaderboard-pinned">
          <span>Your standing</span>
          <LeaderboardTable rows={[view.selfOutsideList]} />
        </div>
      ) : null}

      {!embedded && (offset > 0 || state.hasMore) ? (
        <nav
          className="app-leaderboard-pagination"
          aria-label="Leaderboard pages"
        >
          <button
            type="button"
            className="app-chip"
            disabled={offset === 0}
            onClick={onPrevious}
          >
            Previous
          </button>
          <span>
            {offset + 1}–{Math.min(offset + pageSize, view.totalPlayers)} of{" "}
            {view.totalPlayers}
          </span>
          <button
            type="button"
            className="app-chip"
            disabled={!state.hasMore}
            onClick={onNext}
          >
            Next
          </button>
        </nav>
      ) : null}
    </>
  );
}

function LeaderboardTable({
  rows,
}: {
  readonly rows: LeaderboardView["rows"];
}) {
  return (
    <div className="app-leaderboard-scroll">
      <table className="app-leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Score</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.rank}-${row.username}`}
              className={row.isSelf ? "app-leaderboard-self" : undefined}
            >
              <td>#{row.rank}</td>
              <td>
                <div className="app-leaderboard-player">
                  <PlayerAvatar
                    avatarId={row.avatarId}
                    frameId={row.frameId}
                    label={row.username}
                    size={42}
                  />
                  <span>
                    <strong>{row.username}</strong>
                    {row.tag ? <small>{row.tag}</small> : null}
                  </span>
                </div>
              </td>
              <td>{row.score}</td>
              <td>{row.accuracy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LeaderboardRules() {
  return (
    <section
      className="app-leaderboard-rules"
      aria-labelledby="leaderboard-rules-title"
    >
      <p className="app-section-label">Rules and ranks</p>
      <h2 id="leaderboard-rules-title" className="app-results-section-heading">
        How ranking works
      </h2>
      <ul>
        <li>
          Each game has its own board. Scenario or scoring changes create a new
          board.
        </li>
        <li>
          Only your highest eligible score for the current UTC month counts.
        </li>
        <li>
          Pausing or losing pointer lock makes that run ineligible. Local
          history remains safe.
        </li>
        <li>
          Equal scores share the same place. Accuracy is shown but does not
          break score ties.
        </li>
        <li>
          A new season starts automatically at 00:00 UTC on the first day of
          every month.
        </li>
      </ul>
      <p className="app-subtext">
        Aimer titles use best accuracy. These fixed thresholds stay comparable
        across games; leaderboard place uses score inside one game only.
      </p>
      <div className="app-rank-grid">
        {RANK_TIERS.map((tier, index) => (
          <div key={tier.name}>
            <strong>{tier.name} Aimer</strong>
            <span>
              {tier.minAccuracyPercentage}%
              {index < RANK_TIERS.length - 1
                ? `–${RANK_TIERS[index + 1]!.minAccuracyPercentage - 0.1}%`
                : "+"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
