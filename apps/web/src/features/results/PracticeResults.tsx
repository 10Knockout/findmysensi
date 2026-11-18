"use client";

import React, { useEffect, useState } from "react";
import { BrowserApiClient } from "@findmysensi/api-client";
import {
  RUN_INVALIDATION_MESSAGES,
  type RunRecord,
  type RunTrace,
} from "@findmysensi/trainer-runtime";
import { localRunHistory } from "../training/local-run-history.js";
import { toPracticeRunSubmissionV2 } from "../training/run-sync.js";
import { ModeLeaderboard } from "../leaderboard/ModeLeaderboard.js";
import { buildMovementAnalysis } from "./movement-analysis.js";
import { MovementHeatmap } from "./MovementHeatmap.js";
import {
  buildResultsOverview,
  type OverviewMetric,
  type ResultsOverview,
} from "./results-overview.js";
import { getPracticeResultsRoutes } from "./routes.js";
import { takeRunTrace } from "./run-trace-handoff.js";

interface PracticeResultsProps {
  readonly mode?: string;
  readonly taskName?: string;
  readonly syncEnabled?: boolean;
  readonly leaderboardEnabled?: boolean;
  /**
   * The just-finished run's shot trace. Normally left unset -- the trainer
   * shell stashes it in `run-trace-handoff` and this component picks it up on
   * mount. The prop is a test seam for rendering the heatmap directly.
   */
  readonly trace?: RunTrace | null;
}

type RunSyncState =
  "local" | "syncing" | "listed" | "practice-only" | "pending";

export function PracticeResults({
  mode = "grid",
  taskName,
  syncEnabled = false,
  leaderboardEnabled = true,
  trace,
}: PracticeResultsProps) {
  const [latestRun, setLatestRun] = useState<RunRecord | null>(null);
  const [overview, setOverview] = useState<ResultsOverview | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [syncState, setSyncState] = useState<RunSyncState>("local");
  const [syncAttempt, setSyncAttempt] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [runTrace, setRunTrace] = useState<RunTrace | null>(null);
  const routes = getPracticeResultsRoutes(mode);
  const resolvedTaskName = taskName ?? formatModeLabel(mode);
  const syncCopy = getRunSyncCopy(syncState);

  useEffect(() => {
    setHistoryLoaded(false);
    const history = localRunHistory.getAll();
    const run = history.find((entry) => entry.modeId === mode) ?? null;
    setLatestRun(run);
    setOverview(run ? buildResultsOverview(run, history) : null);
    setSyncState("local");
    setSyncError(null);
    setHistoryLoaded(true);
    // Consume the in-memory trace once. Absent after a reload or a direct
    // visit -- correct: there is no run in progress to analyse.
    setRunTrace(trace ?? takeRunTrace());
  }, [mode, trace]);

  useEffect(() => {
    if (
      !syncEnabled ||
      !leaderboardEnabled ||
      !latestRun ||
      latestRun.modeId !== mode
    ) {
      return;
    }

    let active = true;
    setSyncState("syncing");
    setSyncError(null);

    void (async () => {
      try {
        const result = await new BrowserApiClient().submitPracticeRunV2(
          toPracticeRunSubmissionV2(latestRun),
        );
        if (!active) return;
        if (!result.ok || !result.data) {
          setSyncError(result.error ?? "Account sync is unavailable.");
          setSyncState("pending");
          return;
        }

        const history = localRunHistory.getAll();
        setOverview(
          buildResultsOverview(latestRun, history, result.data.leaderboard),
        );
        setSyncState(result.data.competitiveStatus);
      } catch {
        if (active) {
          setSyncError("Could not sync this run.");
          setSyncState("pending");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [latestRun, leaderboardEnabled, mode, syncAttempt, syncEnabled]);

  return (
    <main className="app-page app-results-page">
      <div className="app-page-inner">
        <article className="app-card app-card-wide app-results-overview">
          <header className="app-results-header">
            <div className="app-results-tag">{syncCopy.tag}</div>
            <p className="app-section-label">Overview</p>
            <h1 className="app-heading">{resolvedTaskName}</h1>
            <p className="app-subtext" role="status">
              {syncCopy.description}
            </p>
            {syncState === "pending" ? (
              <div className="app-results-eligibility">
                <p>{syncError}</p>
                <button
                  type="button"
                  className="app-button app-button-ghost"
                  onClick={() => setSyncAttempt((attempt) => attempt + 1)}
                >
                  Retry sync
                </button>
              </div>
            ) : null}
          </header>

          {latestRun && overview ? (
            <>
              <section aria-labelledby="run-summary-heading">
                <h2
                  id="run-summary-heading"
                  className="app-results-section-title"
                >
                  Run Summary
                </h2>
                <div className="app-stat-grid app-results-summary-grid">
                  {overview.summaryMetrics.map((metric, index) => (
                    <ResultStat
                      key={metric.label}
                      metric={metric}
                      featured={index < 3}
                    />
                  ))}
                </div>
              </section>

              {leaderboardEnabled && !latestRun.leaderboardEligible ? (
                <div className="app-results-eligibility" role="note">
                  <strong>Not leaderboard eligible</strong>
                  <p>
                    This run still remains in your local history.
                    {latestRun.invalidationReasons.length > 0
                      ? ` ${latestRun.invalidationReasons
                          .map((reason) => RUN_INVALIDATION_MESSAGES[reason])
                          .join(" ")}`
                      : " It will not count toward the leaderboard."}
                  </p>
                </div>
              ) : null}

              <section aria-labelledby="task-metrics-heading">
                <h2
                  id="task-metrics-heading"
                  className="app-results-section-title"
                >
                  Task Metrics
                </h2>
                <div className="app-stat-grid app-results-detail-grid">
                  {overview.detailMetrics.map((metric) => (
                    <ResultStat
                      key={metric.label}
                      metric={metric}
                      featured={false}
                    />
                  ))}
                </div>
              </section>

              {runTrace && runTrace.shots.length > 0 ? (
                <section
                  aria-label="Movement analysis"
                  className="results-movement"
                >
                  <p className="app-section-label">
                    Movement analysis · this run only
                  </p>
                  <MovementHeatmap analysis={buildMovementAnalysis(runTrace)} />
                </section>
              ) : null}

              {leaderboardEnabled ? (
                <ModeLeaderboard
                  mode={latestRun.modeId}
                  taskName={resolvedTaskName}
                  scenarioVersion={latestRun.scenarioVersion}
                  scoringVersion={latestRun.scoringVersion}
                  embedded
                  pageSize={10}
                  refreshKey={syncState}
                />
              ) : null}
            </>
          ) : historyLoaded ? (
            <p className="app-subtext app-results-empty">
              No recent local {resolvedTaskName} result found.
            </p>
          ) : (
            <p className="app-subtext app-results-empty">
              Loading local result...
            </p>
          )}

          <div className="app-results-actions">
            <a href={routes.playAgain} className="app-button">
              Play Again
            </a>
            {leaderboardEnabled ? (
              <a
                href={routes.leaderboard}
                className="app-button app-button-ghost"
              >
                View leaderboard
              </a>
            ) : null}
            <a href={routes.hub} className="app-button app-button-ghost">
              Return to Hub
            </a>
          </div>
        </article>
      </div>
    </main>
  );
}

function getRunSyncCopy(state: RunSyncState): {
  readonly tag: string;
  readonly description: string;
} {
  switch (state) {
    case "syncing":
      return {
        tag: "Saving to Account",
        description:
          "Run complete. Your local result is safe while private account sync finishes.",
      };
    case "listed":
      return {
        tag: "Saved to Account",
        description: "Eligible for this mode’s leaderboard.",
      };
    case "practice-only":
      return {
        tag: "Saved to Account · Practice Only",
        description: "This run is saved in your account history.",
      };
    case "pending":
      return {
        tag: "Local Result · Sync Pending",
        description:
          "Your result is available on this device. You can retry account sync.",
      };
    default:
      return {
        tag: "Local Result · Not Submitted",
        description: "This result is available on this device.",
      };
  }
}

function ResultStat({
  metric,
  featured,
}: {
  readonly metric: OverviewMetric;
  readonly featured: boolean;
}) {
  const toneClass = metric.tone ? ` app-stat-card-${metric.tone}` : "";

  return (
    <div
      className={`app-stat-card${featured ? " app-stat-card-featured" : ""}${toneClass}`}
    >
      <b>{metric.label}</b>
      <strong>{metric.value}</strong>
      {metric.note ? <span>{metric.note}</span> : null}
    </div>
  );
}

function formatModeLabel(mode: string): string {
  return mode
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
