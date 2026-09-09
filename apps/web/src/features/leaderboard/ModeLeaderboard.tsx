"use client";

import { useEffect, useState } from "react";
import { BrowserApiClient } from "@findmysensi/api-client";
import {
  buildLeaderboardView,
  type LeaderboardView,
} from "./mode-leaderboard.js";
import { getModeLeaderboardRoutes } from "./routes.js";

interface ModeLeaderboardProps {
  readonly mode: string;
  readonly taskName: string;
  readonly scenarioVersion: number;
  readonly scoringVersion: number;
}

type LoadState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly view: LeaderboardView };

export function ModeLeaderboard({
  mode,
  taskName,
  scenarioVersion,
  scoringVersion,
}: ModeLeaderboardProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const routes = getModeLeaderboardRoutes(mode);

  useEffect(() => {
    let active = true;
    const client = new BrowserApiClient();

    void (async () => {
      const [board, session] = await Promise.all([
        client.getLeaderboardV2(mode, scenarioVersion, scoringVersion),
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

      setState({
        kind: "ready",
        view: buildLeaderboardView(
          board.data,
          session?.user?.username ?? null,
        ),
      });
    })();

    return () => {
      active = false;
    };
  }, [mode, scenarioVersion, scoringVersion]);

  return (
    <main className="app-page app-results-page">
      <div className="app-page-inner">
        <article className="app-card app-card-wide">
          <header className="app-results-header">
            <p className="app-section-label">Leaderboard</p>
            <h1 className="app-heading">{taskName}</h1>
            <p className="app-subtext">
              Best score per player. Updates as runs are synced.
            </p>
          </header>

          {state.kind === "loading" ? (
            <p className="app-subtext">Loading leaderboard…</p>
          ) : state.kind === "error" ? (
            <div role="alert" className="app-alert">
              {state.message}
            </div>
          ) : state.view.rows.length === 0 ? (
            <p className="app-subtext">No scores yet. Be the first.</p>
          ) : (
            <>
              <table className="app-leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {state.view.rows.map((row) => (
                    <tr
                      key={`${row.rank}-${row.username}`}
                      className={
                        row.isSelf ? "app-leaderboard-self" : undefined
                      }
                    >
                      <td>#{row.rank}</td>
                      <td>{row.username}</td>
                      <td>{row.score}</td>
                      <td>{row.achievedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {state.view.selfOutsideList ? (
                <table className="app-leaderboard-table app-leaderboard-self-standing">
                  <tbody>
                    <tr className="app-leaderboard-self">
                      <td>#{state.view.selfOutsideList.rank}</td>
                      <td>{state.view.selfOutsideList.username}</td>
                      <td>{state.view.selfOutsideList.score}</td>
                      <td>{state.view.selfOutsideList.achievedAt}</td>
                    </tr>
                  </tbody>
                </table>
              ) : null}
              {state.view.percentileLabel ? (
                <p className="app-subtext">
                  {state.view.percentileLabel} of ranked players
                </p>
              ) : null}
            </>
          )}

          <div className="app-results-actions">
            <a href={routes.play} className="app-button">
              Play this mode
            </a>
            <a href={routes.results} className="app-button app-button-ghost">
              Back to results
            </a>
            <a href={routes.hub} className="app-button app-button-ghost">
              Return to Hub
            </a>
          </div>
        </article>
      </div>
    </main>
  );
}
