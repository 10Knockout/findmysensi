"use client";

import React, { useEffect, useState } from "react";
import {
  localPracticeHistory,
  PracticeSummaryRecord,
} from "../training/local-history.js";

export function PracticeResults({ mode = "grid" }: { mode?: string }) {
  const [latestRun, setLatestRun] = useState<PracticeSummaryRecord | null>(
    null,
  );

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
        Practice Mode (Offline / Not Synced)
      </div>

      <h1 style={{ fontSize: "2.5rem", fontWeight: 800, margin: "0 0 8px 0" }}>
        Run Complete
      </h1>
      <p style={{ color: "#94a3b8", margin: "0 0 32px 0" }}>
        Results from your practice session.
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
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Score</div>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 900,
                  color: "#00ff88",
                  marginTop: "4px",
                }}
              >
                {latestRun.score.toLocaleString()}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                Accuracy
              </div>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 900,
                  color: "#38bdf8",
                  marginTop: "4px",
                }}
              >
                {latestRun.accuracyPercentage}%
              </div>
            </div>

            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                Hits / Shots
              </div>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  marginTop: "4px",
                }}
              >
                {latestRun.hits} / {latestRun.shots}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                Kills / Sec
              </div>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  marginTop: "4px",
                }}
              >
                {latestRun.killsPerSecond}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ color: "#94a3b8" }}>No recent practice run recorded.</div>
      )}

      <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
        <a
          href={`/train/${mode}`}
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
          href="/"
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
