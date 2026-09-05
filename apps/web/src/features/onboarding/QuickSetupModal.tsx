"use client";

import React, { useState } from "react";
import { BrowserApiClient } from "@findmysensi/api-client";
import { TrainerSettings } from "@findmysensi/protocol";
import {
  type VerifiedSensitivityProfileId,
  gameSensitivityToFms,
  sensitivityToCmPer360,
} from "@findmysensi/sensitivity";

interface QuickSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: TrainerSettings;
  onSaved: (updated: TrainerSettings) => void;
}

const GAME_RECOMMENDED_FOV: Record<VerifiedSensitivityProfileId, number> = {
  valorant: 103,
  cs2: 106,
  apex: 90,
  "aimlab-default": 103,
};

export function QuickSetupModal({
  isOpen,
  onClose,
  currentSettings,
  onSaved,
}: QuickSetupModalProps) {
  const [selectedGame, setSelectedGame] =
    useState<VerifiedSensitivityProfileId>("valorant");
  const [inGameSens, setInGameSens] = useState<number>(0.35);
  const [dpi, setDpi] = useState<number>(800);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGameSelect = (gameId: VerifiedSensitivityProfileId) => {
    setSelectedGame(gameId);
    if (gameId === "valorant") setInGameSens(0.35);
    else if (gameId === "cs2") setInGameSens(1.2);
    else if (gameId === "apex") setInGameSens(1.4);
    else setInGameSens(0.5);
  };

  const cmPer360 =
    inGameSens > 0 && dpi > 0
      ? sensitivityToCmPer360(selectedGame, inGameSens, dpi).toFixed(1)
      : "--";

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const fmsSens = gameSensitivityToFms(selectedGame, inGameSens);
      const recommendedFov = GAME_RECOMMENDED_FOV[selectedGame] ?? 103;

      const updated: TrainerSettings = {
        ...currentSettings,
        fmsSensitivity: fmsSens,
        nominalDpi: dpi,
        fovDegrees: recommendedFov,
      };

      const client = new BrowserApiClient();
      const res = await client.saveTrainerSettings(updated);
      if (!res.ok) {
        throw new Error(res.error ?? "Failed to save profile");
      }

      onSaved(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-overlay" style={{ position: "fixed" }}>
      <div className="app-card app-card-wide">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "grid",
              width: 40,
              height: 40,
              placeItems: "center",
              border: "1px solid rgba(189,255,45,0.4)",
              background: "rgba(189,255,45,0.08)",
              color: "var(--fms-acid)",
            }}
          >
            <svg
              width={20}
              height={20}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="9" strokeWidth="2" />
              <path strokeWidth="2" d="M12 3v4m0 10v4m-9-9h4m10 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="app-heading" style={{ fontSize: 20 }}>
              Calibrate Your Aim
            </h2>
            <p className="app-help" style={{ marginTop: 2 }}>
              Set up your mouse sensitivity & game profile for a 1:1 match
            </p>
          </div>
        </div>

        {error ? (
          <div
            className="app-alert"
            style={{ marginTop: 16, marginBottom: 0 }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ marginTop: 22 }}>
          <div className="app-field">
            <label className="settings-label">Primary Game</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px,1fr))",
                gap: 8,
              }}
            >
              {(
                [
                  ["valorant", "Valorant"],
                  ["cs2", "CS2"],
                  ["apex", "Apex"],
                  ["aimlab-default", "FMS / Aimlabs"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleGameSelect(id)}
                  className={`settings-chip${selectedGame === id ? " settings-chip-active" : ""}`}
                  style={{ textAlign: "center" }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))",
              marginBottom: 18,
            }}
          >
            <div>
              <label
                className="settings-label"
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span>In-Game Sensitivity</span>
                <span
                  style={{ fontFamily: "monospace", color: "var(--fms-acid)" }}
                >
                  {inGameSens}
                </span>
              </label>
              <input
                type="number"
                min={0.01}
                max={20.0}
                step={0.005}
                value={inGameSens}
                onChange={(e) =>
                  setInGameSens(parseFloat(e.target.value) || 0.01)
                }
                className="app-input"
                style={{ fontFamily: "monospace" }}
              />
              <input
                type="range"
                min={0.01}
                max={selectedGame === "valorant" ? 1.5 : 4.0}
                step={0.005}
                value={inGameSens}
                onChange={(e) =>
                  setInGameSens(parseFloat(e.target.value) || 0.01)
                }
                className="accent-acid"
                style={{ marginTop: 8, width: "100%" }}
              />
            </div>

            <div>
              <label className="settings-label">Mouse DPI</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[400, 800, 1600].map((presetDpi) => (
                  <button
                    key={presetDpi}
                    type="button"
                    onClick={() => setDpi(presetDpi)}
                    className={`settings-chip${dpi === presetDpi ? " settings-chip-active" : ""}`}
                    style={{ flex: 1, textAlign: "center" }}
                  >
                    {presetDpi}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={100}
                max={32000}
                step={50}
                value={dpi}
                onChange={(e) => setDpi(parseInt(e.target.value) || 800)}
                className="app-input"
                style={{ marginTop: 8, fontFamily: "monospace" }}
                placeholder="Custom DPI"
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
              padding: 14,
              border: "1px solid var(--fms-line-dark)",
            }}
          >
            <div>
              <span className="settings-label">Turn Distance</span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: 800,
                  color: "var(--fms-acid)",
                }}
              >
                {cmPer360} cm / 360°
              </span>
            </div>
            <div>
              <span className="settings-label">Auto-Configured FOV</span>
              <span style={{ fontFamily: "monospace", fontWeight: 800 }}>
                {GAME_RECOMMENDED_FOV[selectedGame] ?? 103}° ({selectedGame})
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="app-link"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="app-button"
            style={{ width: "auto", padding: "0 26px" }}
          >
            {saving ? "Saving Setup…" : "Confirm & Start Aiming"}
          </button>
        </div>
      </div>
    </div>
  );
}
