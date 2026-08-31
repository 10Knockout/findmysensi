"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GAME_ADAPTERS,
  SupportedGameId,
  convertSensitivity,
} from "@findmysensi/sensitivity";

export default function SensitivityConverterPage() {
  const [sourceGame, setSourceGame] = useState<SupportedGameId>("cs2");
  const [targetGame, setTargetGame] = useState<SupportedGameId>("valorant");
  const [sourceSens, setSourceSens] = useState<number>(2.0);
  const [sourceDpi, setSourceDpi] = useState<number>(800);
  const [targetDpi, setTargetDpi] = useState<number>(800);

  const result = convertSensitivity({
    sourceGame,
    targetGame,
    sourceSensitivity: Math.max(0.0001, sourceSens),
    sourceDpi: Math.max(1, sourceDpi),
    targetDpi: Math.max(1, targetDpi),
  });

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
            FINDMYSENSI TOOLKIT
          </div>
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
            Universal Sensitivity Converter
          </h1>
          <p className="text-zinc-400 text-sm md:text-base">
            Exact physical 360° distance matching across competitive FPS engines
            with DPI preservation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Source Game */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-4">
              1. Source Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Source Game
                </label>
                <select
                  value={sourceGame}
                  onChange={(e) =>
                    setSourceGame(e.target.value as SupportedGameId)
                  }
                  className="w-full px-4 py-3 bg-black/60 border border-zinc-800 rounded-lg text-white font-medium focus:outline-none focus:border-emerald-400"
                >
                  {Object.values(GAME_ADAPTERS).map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  In-Game Sensitivity
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={sourceSens}
                  onChange={(e) =>
                    setSourceSens(parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-4 py-3 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Mouse DPI / CPI
                </label>
                <input
                  type="number"
                  step="50"
                  min="100"
                  value={sourceDpi}
                  onChange={(e) =>
                    setSourceDpi(parseInt(e.target.value, 10) || 800)
                  }
                  className="w-full px-4 py-3 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Target Game */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-4">
              2. Target Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Target Game
                </label>
                <select
                  value={targetGame}
                  onChange={(e) =>
                    setTargetGame(e.target.value as SupportedGameId)
                  }
                  className="w-full px-4 py-3 bg-black/60 border border-zinc-800 rounded-lg text-white font-medium focus:outline-none focus:border-cyan-400"
                >
                  {Object.values(GAME_ADAPTERS).map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Target Mouse DPI / CPI
                </label>
                <input
                  type="number"
                  step="50"
                  min="100"
                  value={targetDpi}
                  onChange={(e) =>
                    setTargetDpi(parseInt(e.target.value, 10) || 800)
                  }
                  className="w-full px-4 py-3 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-cyan-950/40 border border-zinc-700/60 rounded-xl p-8 text-center shadow-2xl">
          <div className="text-xs uppercase font-mono tracking-widest text-zinc-400 mb-2">
            Converted Sensitivity for {GAME_ADAPTERS[targetGame].name}
          </div>
          <div className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-mono my-4">
            {result.formattedTargetSensitivity}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-800 text-left">
            <div className="bg-black/40 p-4 rounded-lg">
              <div className="text-xs font-mono text-zinc-500 uppercase">
                Physical 360°
              </div>
              <div className="text-lg font-bold text-white font-mono mt-1">
                {result.formattedCmPer360} cm
              </div>
            </div>
            <div className="bg-black/40 p-4 rounded-lg">
              <div className="text-xs font-mono text-zinc-500 uppercase">
                Inches / 360°
              </div>
              <div className="text-lg font-bold text-white font-mono mt-1">
                {result.inPer360.toFixed(2)} in
              </div>
            </div>
            <div className="bg-black/40 p-4 rounded-lg">
              <div className="text-xs font-mono text-zinc-500 uppercase">
                Yaw per Count
              </div>
              <div className="text-lg font-bold text-white font-mono mt-1">
                {result.yawDegreesPerCount.toFixed(5)}°
              </div>
            </div>
            <div className="bg-black/40 p-4 rounded-lg">
              <div className="text-xs font-mono text-zinc-500 uppercase">
                Engine Adapter
              </div>
              <div className="text-lg font-bold text-white font-mono mt-1">
                {targetGame.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
