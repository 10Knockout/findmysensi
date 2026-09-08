"use client";

import React, { useEffect, useRef, useState } from "react";
import { BrowserApiClient } from "@findmysensi/api-client";
import {
  RUN_INVALIDATION_MESSAGES,
  type RunRecord,
} from "@findmysensi/trainer-runtime";
import { localRunHistory } from "../training/local-run-history.js";
import { toPracticeRunSubmissionV2 } from "../training/run-sync.js";
import {
  buildResultsOverview,
  type OverviewMetric,
  type ResultsOverview,
} from "./results-overview.js";
import { getPracticeResultsRoutes } from "./routes.js";

interface PracticeResultsProps {
  readonly mode?: string;
  readonly taskName?: string;
  readonly syncEnabled?: boolean;
}

type RunSyncState = "local" | "syncing" | "saved" | "pending";

export function PracticeResults({
  mode = "grid",
  taskName,
  syncEnabled = false,
}: PracticeResultsProps) {
  const [latestRun, setLatestRun] = useState<RunRecord | null>(null);
  const [overview, setOverview] = useState<ResultsOverview | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [syncState, setSyncState] = useState<RunSyncState>("local");
  const attemptedRunId = useRef<string | null>(null);
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
    setHistoryLoaded(true);
  }, [mode]);

  useEffect(() => {
    if (
      !syncEnabled ||
      !latestRun ||
      attemptedRunId.current === latestRun.runId
    ) {
      return;
    }

    attemptedRunId.current = latestRun.runId;
    let active = true;
    setSyncState("syncing");

    void (async () => {
      try {
        const result = await new BrowserApiClient().submitPracticeRunV2(
          toPracticeRunSubmissionV2(latestRun),
        );
        if (!active) return;
        if (!result.ok || !result.data) {
          setSyncState("pending");
          return;
        }

        const history = localRunHistory.getAll();
        setOverview(
          buildResultsOverview(latestRun, history, result.data.leaderboard),
        );
        setSyncState("saved");
      } catch {
        if (active) setSyncState("pending");
      }
    })();

    return () => {
      active = false;
    };
  }, [latestRun, syncEnabled]);

  return (
    <main className="app-page app-results-page">
      <div className="app-page-inner">
        <article className="app-card app-card-wide app-results-overview">
          <header className="app-results-header">
            <div className="app-results-tag">{syncCopy.tag}</div>
            <p className="app-section-label">Overview</p>
            <h1 className="app-heading">{resolvedTaskName}</h1>
            <p className="app-subtext">{syncCopy.description}</p>
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

              {!latestRun.leaderboardEligible ? (
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
            <a href={routes.leaderboard} className="app-button app-button-ghost">
              View leaderboard
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
    case "saved":
      return {
        tag: "Saved to Account",
        description:
          "Your best score for this mode is now on the public leaderboard.",
      };
    case "pending":
      return {
        tag: "Local Result · Sync Pending",
        description:
          "Your result is safe locally. Account sync can retry when this page is opened again.",
      };
    default:
      return {
        tag: "Local Result · Not Submitted",
        description:
          "Run complete. This result is stored locally; official leaderboard verification is not enabled yet.",
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
