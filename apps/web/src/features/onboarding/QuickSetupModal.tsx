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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-zinc-950 p-6 shadow-2xl shadow-cyan-950/50 sm:p-8">
        {/* Glow Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="9" strokeWidth="2" />
              <path strokeWidth="2" d="M12 3v4m0 10v4m-9-9h4m10 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Calibrate Your Aim
            </h2>
            <p className="text-xs text-zinc-400">
              Set up your mouse sensitivity & game profile for a 1:1 match
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-xs text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-6 space-y-5">
          {/* Game Selection */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
              Primary Game
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                  className={`rounded-xl border py-2.5 px-3 text-center text-xs font-bold transition-all ${
                    selectedGame === id
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-md shadow-cyan-950/40"
                      : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sensitivity & DPI */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
                <span>In-Game Sensitivity</span>
                <span className="font-mono text-cyan-400">{inGameSens}</span>
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
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
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
                className="mt-2 w-full accent-cyan-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-400">
                Mouse DPI
              </label>
              <div className="flex gap-2">
                {[400, 800, 1600].map((presetDpi) => (
                  <button
                    key={presetDpi}
                    type="button"
                    onClick={() => setDpi(presetDpi)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-bold font-mono transition-all ${
                      dpi === presetDpi
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                    }`}
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
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                placeholder="Custom DPI"
              />
            </div>
          </div>

          {/* Physical Metric & FOV Readout */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-800 bg-black/60 p-3.5">
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-zinc-500">
                Turn Distance
              </span>
              <span className="font-mono text-sm font-bold text-cyan-300">
                {cmPer360} cm / 360°
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-zinc-500">
                Auto-Configured FOV
              </span>
              <span className="font-mono text-sm font-bold text-emerald-400">
                {GAME_RECOMMENDED_FOV[selectedGame] ?? 103}° ({selectedGame})
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-300 active:scale-95 disabled:opacity-50"
          >
            {saving ? "Saving Setup…" : "Confirm & Start Aiming"}
          </button>
        </div>
      </div>
    </div>
  );
}
