"use client";

import { useCallback, useEffect, useState } from "react";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { LeaderboardRow } from "@findmysensi/protocol";

const REFRESH_MS = 15_000;

export function LiveLeaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await new BrowserApiClient().getLeaderboard("gridshot");
    if (!result.ok || !result.data) {
      setRows(null);
      setError(result.error ?? "Leaderboard is unavailable.");
      return;
    }
    setRows(result.data.rows);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-200"
      >
        Could not load the live Gridshot leaderboard. {error}
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
        Loading live Gridshot leaderboard…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
        No verified Gridshot scores yet.
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
              key={row.userId}
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
