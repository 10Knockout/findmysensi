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
    <div
      style={{
        maxWidth: "800px",
        margin: "60px auto",
        padding: "32px",
        backgroundColor: "#0f1117",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "#f8fafc",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "6px 12px",
          borderRadius: "6px",
          backgroundColor: "rgba(255, 170, 0, 0.15)",
          color: "#ffaa00",
          fontSize: "0.85rem",
          fontWeight: 700,
          letterSpacing: "0.5px",
          marginBottom: "16px",
          textTransform: "uppercase",
        }}
      >
        Local Result · Not Submitted
      </div>

      <h1 style={{ fontSize: "2.5rem", fontWeight: 800, margin: "0 0 8px 0" }}>
        Run Complete
      </h1>
      <p style={{ color: "#94a3b8", margin: "0 0 32px 0" }}>
        This run is stored locally. Official leaderboard verification is not
        enabled yet.
      </p>

      {latestRun ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "16px",
            }}
          >
            {getResultStats(latestRun).map(([label, value], index) => (
              <ResultStat
                key={label}
                label={label}
                value={value}
                featured={index < 2}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ color: "#94a3b8" }}>
          No recent local {modeLabel} result found.
        </div>
      )}

      <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
        <a
          href={routes.playAgain}
          style={{
            backgroundColor: "#00ff88",
            color: "#07090e",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          Play Again
        </a>
        <a
          href={routes.hub}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            color: "#f8fafc",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Return to Hub
        </a>
      </div>
    </div>
  );
}

function getResultStats(record: PracticeSummaryRecord): [string, string][] {
  const score: [string, string] = ["Score", record.score.toLocaleString()];
  if (record.modeId === "smooth-track") {
    return [
      score,
      ["On Target", `${record.onTargetPercentage}%`],
      ["Average Error", record.averageErrorUnits.toLocaleString()],
      ["Max Error", record.maxErrorUnits.toLocaleString()],
    ];
  }
  if (record.modeId === "tempo") {
    return [
      score,
      ["Perfect", `${record.perfectPercentage}%`],
      ["Perfect / Early", `${record.perfect} / ${record.early}`],
      ["Late / Miss", `${record.late} / ${record.miss}`],
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
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.05)",
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>{label}</div>
      <div
        style={{
          fontSize: featured ? "2rem" : "1.8rem",
          fontWeight: featured ? 900 : 800,
          color: label === "Score" ? "#00ff88" : undefined,
          marginTop: "4px",
        }}
      >
        {value}
      </div>
    </div>
  );
}
