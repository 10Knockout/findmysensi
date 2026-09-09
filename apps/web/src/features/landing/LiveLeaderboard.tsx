"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { LeaderboardRowV2 } from "@findmysensi/protocol";
import { gamerTagLabel } from "@findmysensi/trainer-runtime";
import { PlayerAvatar } from "../profile/PlayerAvatar.js";

const REFRESH_MS = 15_000;
const ROTATE_MS = 8_000;

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
  const [activeIndex, setActiveIndex] = useState(0);
  const [rows, setRows] = useState<LeaderboardRowV2[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const activeMode = modes[activeIndex] ?? modes[0];

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

  useEffect(() => {
    if (paused || modes.length < 2) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setActiveIndex((index) => (index + 1) % modes.length);
      }
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [modes.length, paused]);

  if (!activeMode) return null;

  const move = (direction: -1 | 1) => {
    setActiveIndex((index) => (index + direction + modes.length) % modes.length);
  };

  return (
    <div
      className="landing-leaderboard-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <header className="landing-leaderboard-head">
        <div>
          <span>Top 10 · rotates every 8 seconds</span>
          <h3 aria-live="polite">{activeMode.title}</h3>
        </div>
        <div className="landing-leaderboard-controls">
          <button type="button" onClick={() => move(-1)} aria-label="Previous game">
            ←
          </button>
          <span>{activeIndex + 1} / {modes.length}</span>
          <button type="button" onClick={() => move(1)} aria-label="Next game">
            →
          </button>
        </div>
      </header>

      {error ? (
        <div role="alert" className="landing-leaderboard-state landing-leaderboard-error">
          Could not load {activeMode.title}. {error}
        </div>
      ) : rows === null ? (
        <div className="landing-leaderboard-state">Loading {activeMode.title}…</div>
      ) : rows.length === 0 ? (
        <div className="landing-leaderboard-state">No {activeMode.title} scores yet.</div>
      ) : (
        <div className="landing-leaderboard-scroll">
          <table className="landing-leaderboard-table">
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

      <div className="landing-leaderboard-dots" aria-label="Choose game leaderboard">
        {modes.map((mode, index) => (
          <button
            type="button"
            key={mode.modeId}
            aria-label={`Show ${mode.title}`}
            aria-pressed={index === activeIndex}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
      <Link href="/leaderboards" className="landing-arrow-link">
        View all leaderboards
      </Link>
    </div>
  );
}
