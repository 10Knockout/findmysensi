"use client";

import React, { useState } from "react";
import Link from "next/link";
import { calculateMouseSwap } from "@findmysensi/sensitivity";

export default function MouseSwapPage() {
  const [originalSens, setOriginalSens] = useState<number>(1.0);
  const [oldName, setOldName] = useState<string>("Logitech G Pro X Superlight");
  const [oldDpi, setOldDpi] = useState<number>(400);
  const [newName, setNewName] = useState<string>("Razer Viper V3 Pro");
  const [newDpi, setNewDpi] = useState<number>(800);

  const result = calculateMouseSwap(
    Math.max(0.001, originalSens),
    { name: oldName, dpi: Math.max(1, oldDpi) },
    { name: newName, dpi: Math.max(1, newDpi) },
  );

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
            EQUIPMENT ADAPTER
          </div>
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
            Mouse Swap Calculator
          </h1>
          <p className="text-zinc-400 text-sm md:text-base">
            Switching mice or altering DPI steps? Preserve identical cursor
            physical velocity with ease.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Old Mouse */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-4">
              Previous Mouse
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                  Mouse Model Name
                </label>
                <input
                  type="text"
                  value={oldName}
                  onChange={(e) => setOldName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/60 border border-zinc-800 rounded-lg text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                  Original DPI / CPI
                </label>
                <input
                  type="number"
                  step="50"
                  min="50"
                  value={oldDpi}
                  onChange={(e) =>
                    setOldDpi(parseInt(e.target.value, 10) || 400)
                  }
                  className="w-full px-4 py-3 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                  Original In-Game Sensitivity
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.001"
                  value={originalSens}
                  onChange={(e) =>
                    setOriginalSens(parseFloat(e.target.value) || 0.1)
                  }
                  className="w-full px-4 py-3 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* New Mouse */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-4">
              New Mouse
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                  New Mouse Model Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/60 border border-zinc-800 rounded-lg text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                  New DPI / CPI
                </label>
                <input
                  type="number"
                  step="50"
                  min="50"
                  value={newDpi}
                  onChange={(e) =>
                    setNewDpi(parseInt(e.target.value, 10) || 800)
                  }
                  className="w-full px-4 py-3 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Result Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center shadow-2xl">
          <div className="text-xs uppercase font-mono tracking-widest text-zinc-400 mb-2">
            Target In-Game Sensitivity
          </div>
          <div className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-mono my-4">
            {result.adjustedSens.toFixed(4)}
          </div>
          <p className="text-sm text-zinc-300 max-w-lg mx-auto mt-4">
            {result.explanation}
          </p>
        </div>
      </div>
    </main>
  );
}
