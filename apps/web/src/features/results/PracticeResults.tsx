"use client";

import React, { useEffect, useState } from "react";
import {
  localPracticeHistory,
  PracticeSummaryRecord,
} from "../training/local-history.js";
import { getPracticeResultsRoutes } from "./routes.js";

export function PracticeResults({ mode = "grid" }: { mode?: string }) {
  const [latestRun, setLatestRun] = useState<PracticeSummaryRecord | null>(
    null,
  );
  const routes = getPracticeResultsRoutes(mode);
  const modeLabel = mode
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  useEffect(() => {
    const history = localPracticeHistory.getAll(mode);
    if (history.length > 0) {
      setLatestRun(history[0] || null);
    }
  }, [mode]);

  return (
    <div className="app-card app-card-wide" style={{ margin: "60px auto" }}>
      <div className="app-results-tag">Local Result · Not Submitted</div>

      <h1 className="app-heading" style={{ fontSize: "clamp(30px,4vw,40px)" }}>
        Run Complete
      </h1>
      <p className="app-subtext">
        This run is stored locally. Official leaderboard verification is not
        enabled yet.
      </p>

      {latestRun ? (
        <div className="app-stat-grid" style={{ marginTop: 28 }}>
          {getResultStats(latestRun).map(([label, value], index) => (
            <ResultStat
              key={label}
              label={label}
              value={value}
              featured={index < 2}
            />
          ))}
        </div>
      ) : (
        <p className="app-subtext">No recent local {modeLabel} result found.</p>
      )}

      <div className="app-results-actions">
        <a href={routes.playAgain} className="app-button" style={{ flex: 1 }}>
          Play Again
        </a>
        <a
          href={routes.hub}
          className="app-button app-button-ghost"
          style={{ flex: 1 }}
        >
          Return to Hub
        </a>
      </div>
    </div>
  );
}

function getResultStats(record: PracticeSummaryRecord): [string, string][] {
  const score: [string, string] = ["Score", record.score.toLocaleString()];
  if (record.modeId === "smooth-track" || record.modeId === "strafe") {
    return [
      score,
      ["On Target", `${record.onTargetPercentage}%`],
      ["Average Error", record.averageErrorUnits.toLocaleString()],
      ["Max Error", record.maxErrorUnits.toLocaleString()],
    ];
  }
  if (record.modeId === "switch-track") {
    return [
      score,
      ["Switches", String(record.switchesCompleted)],
      ["On Target", `${record.onTargetPercentage}%`],
      ["Avg Acquisition", `${record.averageAcquisitionTicks} ticks`],
    ];
  }
  return [
    score,
    ["Accuracy", `${record.accuracyPercentage}%`],
    ["Hits / Shots", `${record.hits} / ${record.shots}`],
    ["Kills / Sec", String(record.killsPerSecond)],
  ];
}

function ResultStat({
  label,
  value,
  featured,
}: {
  label: string;
  value: string;
  featured: boolean;
}) {
  return (
    <div className="app-stat-card">
      <b>{label}</b>
      <strong
        style={{
          fontSize: featured ? 28 : 22,
          color: label === "Score" ? "var(--fms-acid)" : undefined,
        }}
      >
        {value}
      </strong>
    </div>
  );
}
