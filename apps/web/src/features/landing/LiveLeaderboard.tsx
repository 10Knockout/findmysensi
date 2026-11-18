"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { LeaderboardRowV2 } from "@findmysensi/protocol";
import { gamerTagLabel } from "@findmysensi/trainer-runtime";
import { PlayerAvatar } from "../profile/PlayerAvatar.js";
import styles from "./LandingHero.module.css";

const REFRESH_MS = 15_000;

export interface LeaderboardModeOption {
  readonly modeId: string;
  readonly title: string;
  readonly scenarioVersion: number;
  readonly scoringVersion: number;
}

export function LiveLeaderboard({
  modes,
}: {
  readonly modes: readonly LeaderboardModeOption[];
}) {
  const [selectedMode, setSelectedMode] = useState(modes[0]?.modeId ?? "");
  const [rows, setRows] = useState<LeaderboardRowV2[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeMode =
    modes.find((mode) => mode.modeId === selectedMode) ?? modes[0];

  useEffect(() => {
    if (!activeMode) return;
    const client = new BrowserApiClient();
    let disposed = false;
    let loading = false;
    let timer: number | undefined;

    const clearTimer = () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
    const schedule = () => {
      clearTimer();
      if (!disposed && document.visibilityState === "visible") {
        timer = window.setTimeout(() => void load(), REFRESH_MS);
      }
    };
    const load = async () => {
      if (disposed || loading || document.visibilityState !== "visible") return;
      loading = true;
      try {
        const result = await client.getLeaderboardV2(
          activeMode.modeId,
          activeMode.scenarioVersion,
          activeMode.scoringVersion,
          { limit: 10, offset: 0 },
        );
        if (disposed) return;
        if (!result.ok || !result.data) {
          setRows(null);
          setError(result.error ?? "Leaderboard is unavailable.");
          return;
        }
        setRows(result.data.rows.slice(0, 10));
        setError(null);
      } catch {
        if (!disposed) {
          setRows(null);
          setError("Leaderboard is unavailable.");
        }
      } finally {
        loading = false;
        schedule();
      }
    };
    const handleVisibilityChange = () => {
      clearTimer();
      if (document.visibilityState === "visible") void load();
    };

    setRows(null);
    setError(null);
    void load();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      disposed = true;
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeMode]);

  if (!activeMode) return null;

  return (
    <div className={styles.board}>
      <header className={styles.boardHead}>
        <h3 aria-live="polite">Top scores · {activeMode.title}</h3>
        <select
          aria-label="Leaderboard drill"
          value={activeMode.modeId}
          onChange={(event) => {
            if (event.target.value === activeMode.modeId) return;
            setRows(null);
            setError(null);
            setSelectedMode(event.target.value);
          }}
        >
          {modes.map((mode) => (
            <option key={mode.modeId} value={mode.modeId}>
              {mode.title}
            </option>
          ))}
        </select>
      </header>

      <div className={styles.boardBody}>
        {error ? (
          <div role="alert" className={styles.boardStatus}>
            Could not load {activeMode.title}. {error}
          </div>
        ) : rows === null ? (
          <div role="status" className={styles.boardStatus}>
            Loading {activeMode.title}…
          </div>
        ) : rows.length === 0 ? (
          <div className={styles.boardStatus}>
            No {activeMode.title} scores yet.
          </div>
        ) : (
          <div className={styles.boardScroll}>
            <table
              className={styles.boardTable}
              aria-label={`${activeMode.title} leaderboard`}
            >
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Score</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const tag = gamerTagLabel(row.tagId ?? "tag-none");
                  return (
                    <tr key={`${row.rank}-${row.username}`}>
                      <td>#{row.rank}</td>
                      <td>
                        <div className="app-leaderboard-player">
                          <PlayerAvatar
                            avatarId={row.avatarId ?? "avatar-default"}
                            frameId={row.frameId ?? "frame-none"}
                            label={row.username}
                            size={36}
                          />
                          <span>
                            <strong>{row.username}</strong>
                            {tag ? <small>{tag}</small> : null}
                          </span>
                        </div>
                      </td>
                      <td>{row.score.toLocaleString("en-US")}</td>
                      <td>
                        {row.accuracyPercentage === null ||
                        row.accuracyPercentage === undefined
                          ? "—"
                          : `${row.accuracyPercentage.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.boardFoot}>
        <Link href="/leaderboards">View all leaderboards</Link>
      </div>
    </div>
  );
}
