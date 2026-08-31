"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CalibrationState,
  initializeCalibration,
  submitCalibrationChoice,
} from "@findmysensi/sensitivity";

export default function SensiLabPage() {
  const [minSens, setMinSens] = useState<number>(0.2);
  const [maxSens, setMaxSens] = useState<number>(2.0);
  const [calibState, setCalibState] = useState<CalibrationState | null>(null);

  const handleStart = () => {
    setCalibState(initializeCalibration(minSens, maxSens, 7));
  };

  const handleSelect = (choice: "A" | "B") => {
    if (!calibState) return;
    setCalibState(submitCalibrationChoice(calibState, choice));
  };

  const handleReset = () => {
    setCalibState(null);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/app"
            className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
          >
            ← Back to Hub
          </Link>
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            SENSI LAB V1
          </div>
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
            Sensi Lab — Blind Calibration
          </h1>
          <p className="text-zinc-400 text-sm md:text-base">
            Binary search tournament to discover your subconscious optimal
            sensitivity without cognitive bias.
          </p>
        </div>

        {!calibState && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-xl mx-auto shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">
              Initial Calibration Bounds
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              Enter your comfortable minimum and maximum sensitivity range (in
              your primary game unit).
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                  Min Sensitivity
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  value={minSens}
                  onChange={(e) =>
                    setMinSens(parseFloat(e.target.value) || 0.1)
                  }
                  className="w-full px-4 py-3 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                  Max Sensitivity
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  value={maxSens}
                  onChange={(e) =>
                    setMaxSens(parseFloat(e.target.value) || 2.0)
                  }
                  className="w-full px-4 py-3 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-4 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold rounded-lg transition-colors"
            >
              Start 7-Round Blind Tournament
            </button>
          </div>
        )}

        {calibState && !calibState.isComplete && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-2xl mx-auto shadow-2xl text-center">
            <div className="flex justify-between items-center text-xs font-mono text-zinc-500 uppercase mb-6">
              <span>
                ROUND {calibState.round} OF {calibState.maxRounds}
              </span>
              <span>
                BRACKET RANGE: [{calibState.lowSens.toFixed(2)} -{" "}
                {calibState.highSens.toFixed(2)}]
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Pairwise Blind Evaluation
            </h2>
            <p className="text-sm text-zinc-400 mb-8">
              Try both sensitivities in your practice session, then select the
              one that felt more consistent and controllable.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <button
                onClick={() => handleSelect("A")}
                className="p-8 rounded-xl bg-black/50 hover:bg-emerald-950/40 border border-zinc-800 hover:border-emerald-500/50 transition-all text-center group"
              >
                <div className="text-xs font-mono text-zinc-500 uppercase mb-2">
                  CANDIDATE A
                </div>
                <div className="text-4xl font-extrabold text-white group-hover:text-emerald-400 font-mono mb-2">
                  {calibState.currentA.toFixed(3)}
                </div>
                <div className="text-xs text-zinc-400 group-hover:text-emerald-300">
                  Select Option A
                </div>
              </button>

              <button
                onClick={() => handleSelect("B")}
                className="p-8 rounded-xl bg-black/50 hover:bg-cyan-950/40 border border-zinc-800 hover:border-cyan-500/50 transition-all text-center group"
              >
                <div className="text-xs font-mono text-zinc-500 uppercase mb-2">
                  CANDIDATE B
                </div>
                <div className="text-4xl font-extrabold text-white group-hover:text-cyan-400 font-mono mb-2">
                  {calibState.currentB.toFixed(3)}
                </div>
                <div className="text-xs text-zinc-400 group-hover:text-cyan-300">
                  Select Option B
                </div>
              </button>
            </div>
          </div>
        )}

        {calibState?.isComplete && (
          <div className="bg-gradient-to-br from-zinc-900 to-emerald-950/30 border border-emerald-500/40 rounded-xl p-8 max-w-xl mx-auto shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Calibration Complete
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              Your converged optimal sensitivity based on pairwise tournament
              selection:
            </p>

            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-mono mb-6">
              {calibState.recommendedSens?.toFixed(3)}
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleReset}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors"
              >
                Recalibrate
              </button>
              <Link
                href="/train/grid"
                className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold rounded-lg transition-colors inline-block"
              >
                Test in Grid Practice
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
