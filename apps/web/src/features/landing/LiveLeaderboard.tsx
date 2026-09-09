"use client";

import { useEffect, useState } from "react";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { LeaderboardRowV2 } from "@findmysensi/protocol";

const REFRESH_MS = 15_000;

export function LiveLeaderboard() {
  const [rows, setRows] = useState<LeaderboardRowV2[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = new BrowserApiClient();
    let disposed = false;
    let loading = false;
    let timer: number | undefined;

    const clearTimer = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const schedule = () => {
      clearTimer();
      if (!disposed && document.visibilityState === "visible") {
        timer = window.setTimeout(() => void load(), REFRESH_MS);
      }
    };

    const load = async () => {
      if (disposed || loading || document.visibilityState !== "visible") {
        return;
      }

      loading = true;
      try {
        const result = await client.getLeaderboardV2("grid", 0, 0);
        if (disposed) return;

        if (!result.ok || !result.data) {
          setRows(null);
          setError(result.error ?? "Leaderboard is unavailable.");
          return;
        }
        setRows(result.data.rows.slice());
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

    void load();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-200"
      >
        Could not load the live Grid Rush leaderboard. {error}
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
        Loading live Grid Rush leaderboard…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
        No Grid Rush scores yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-800 bg-black/30 text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((row) => (
            <tr
              key={`${row.rank}-${row.username}`}
              className="border-b border-zinc-800/70 last:border-0"
            >
              <td className="px-4 py-3 font-mono text-zinc-400">#{row.rank}</td>
              <td className="px-4 py-3 font-semibold text-zinc-100">
                {row.username}
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                {row.score.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
