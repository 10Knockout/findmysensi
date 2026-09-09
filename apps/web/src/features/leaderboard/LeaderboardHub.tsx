"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import { ModeLeaderboard } from "./ModeLeaderboard.js";

export interface LeaderboardHubMode {
  readonly modeId: string;
  readonly title: string;
  readonly scenarioVersion: number;
  readonly scoringVersion: number;
}

export function LeaderboardHub({
  modes,
  requireSession = false,
}: {
  readonly modes: readonly LeaderboardHubMode[];
  readonly requireSession?: boolean;
}) {
  const router = useRouter();
  const [activeModeId, setActiveModeId] = useState(modes[0]?.modeId ?? "");
  const [sessionChecked, setSessionChecked] = useState(!requireSession);
  const activeMode =
    modes.find((mode) => mode.modeId === activeModeId) ?? modes[0];

  useEffect(() => {
    if (!requireSession) return;
    let active = true;
    void new BrowserApiClient().getSession().then((session) => {
      if (!active) return;
      if (!session?.user) {
        router.replace("/login?next=/app/leaderboards");
        return;
      }
      setSessionChecked(true);
    });
    return () => {
      active = false;
    };
  }, [requireSession, router]);

  if (!sessionChecked) {
    return (
      <main className="app-shell">
        <p className="app-subtext">Checking your session…</p>
      </main>
    );
  }
  if (!activeMode) return null;

  return (
    <main className="app-page">
      <div className="app-page-inner">
        <header className="app-page-header">
          <div>
            <Link href={requireSession ? "/app" : "/"} className="app-link">
              ← {requireSession ? "Trainer Home" : "Main site"}
            </Link>
            <p className="app-section-label app-leaderboard-hub-label">Monthly competition</p>
            <h1 className="app-section-title">All Leaderboards</h1>
            <p className="app-section-copy">
              Choose any game. Every board has its own scores, accuracy, and monthly ranks.
            </p>
          </div>
          {!requireSession ? (
            <Link href="/register" className="app-chip app-chip-acid">
              Play free
            </Link>
          ) : null}
        </header>

        <nav className="app-leaderboard-mode-tabs" aria-label="Game leaderboards">
          {modes.map((mode) => (
            <button
              type="button"
              key={mode.modeId}
              onClick={() => setActiveModeId(mode.modeId)}
              aria-pressed={mode.modeId === activeMode.modeId}
              className={`app-chip${mode.modeId === activeMode.modeId ? " app-chip-acid" : ""}`}
            >
              {mode.title}
            </button>
          ))}
        </nav>

        <ModeLeaderboard
          key={activeMode.modeId}
          mode={activeMode.modeId}
          taskName={activeMode.title}
          scenarioVersion={activeMode.scenarioVersion}
          scoringVersion={activeMode.scoringVersion}
          contained
          showActions={false}
          pageSize={50}
        />

        <div className="app-results-actions app-leaderboard-hub-actions">
          <Link href={`/app/train/${activeMode.modeId}`} className="app-button">
            Play {activeMode.title}
          </Link>
          <Link
            href={`/app/train/${activeMode.modeId}/leaderboard`}
            className="app-button app-button-ghost"
          >
            Open game board
          </Link>
        </div>
      </div>
    </main>
  );
}
